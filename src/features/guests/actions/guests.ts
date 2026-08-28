'use server';

import { getCurrentUser } from '@/features/auth/queries';
import { assertNotImpersonating } from '@/lib/supabase/admin';
import {
  GuestUpsertSchema,
  AppToDbTransformerSchema,
  ImportGuestSchema,
  resolveImportErrorMessage,
  type ImportGuestData,
} from '@/features/guests/schemas';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toE164, phoneComparisonKey } from '@/lib/phone';
import { getEventGuestPhones } from '@/features/guests/queries';
import { z } from 'zod';

export type UpsertGuestState = {
  success: boolean;
  errors?: z.ZodError<z.input<typeof GuestUpsertSchema>>;
  message?: string | null;
};

export type DeleteGuestState = {
  success: boolean;
  message: string;
};

export async function upsertGuest(
  eventId: string,
  formData: FormData,
): Promise<UpsertGuestState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to upsert guests',
      };
    }

    const rawData = Object.fromEntries(formData);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedData: Record<string, any> = { ...rawData };
    if (parsedData.amount && typeof parsedData.amount === 'string') {
      parsedData.amount = Number(parsedData.amount);
    }
    // Handle explicit null for groupId (remove from group)
    if (parsedData.groupId === 'null') {
      parsedData.groupId = null;
    }
    if (parsedData.side === 'null') {
      parsedData.side = null;
    }
    // Explicit null for tableId unseats the guest
    if (parsedData.tableId === 'null') {
      parsedData.tableId = null;
    }

    const validationResult = GuestUpsertSchema.safeParse(parsedData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        success: false,
        message: firstError.message,
      };
    }

    const validatedData = validationResult.data;
    const dbData = AppToDbTransformerSchema.parse(validatedData);

    const supabase = await createClient();

    // Only update attribution when the RSVP status is actually changing.
    // For new guests (no id) there's no prior status, so skip.
    // For updates, fetch the current value and compare.
    if (dbData.rsvp_status !== undefined && validatedData.id) {
      const { data: existing } = await supabase
        .from('guests')
        .select('rsvp_status')
        .eq('id', validatedData.id)
        .maybeSingle();

      if (existing && dbData.rsvp_status !== existing.rsvp_status) {
        dbData.rsvp_changed_by = currentUser.id;
        dbData.rsvp_changed_by_name = currentUser.displayName;
        dbData.rsvp_changed_at = new Date().toISOString();
        dbData.rsvp_change_source = 'manual';
      }
    }

    // Partial updates (e.g. from the AI chat's propose tools) may omit
    // NOT NULL columns like `name`. `upsert()` runs as an INSERT ... ON
    // CONFLICT DO UPDATE, and Postgres validates NOT NULL against the
    // INSERT's column list before it even checks for a conflict - so a
    // partial payload would fail even though the row already exists and
    // only needs an UPDATE. Branch explicitly instead.
    const { error } = validatedData.id
      ? await supabase
          .from('guests')
          .update(dbData)
          .eq('id', validatedData.id)
          .eq('event_id', eventId)
      : await supabase.from('guests').insert({
          ...dbData,
          event_id: eventId,
        });

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not upsert guest.',
      };
    }

    revalidatePath(`/app/${eventId}/guests`);
    return {
      success: true,
      message: validatedData.id
        ? 'Guest updated successfully.'
        : 'Guest created successfully.',
    };
  } catch (error) {
    console.error('Upsert guest error:', error);
    return {
      success: false,
      message: 'Failed to upsert guest. Please try again.',
    };
  }
}

export async function deleteGuest(guestId: string): Promise<DeleteGuestState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to delete guests',
      };
    }

    const supabase = await createClient();

    const { data: guestRow } = await supabase
      .from('guests')
      .select('event_id')
      .eq('id', guestId)
      .maybeSingle();

    const { error } = await supabase.from('guests').delete().eq('id', guestId);

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not delete guest.',
      };
    }

    if (guestRow?.event_id) {
      revalidatePath(`/app/${guestRow.event_id}/guests`);
    } else {
      revalidatePath('/app');
    }
    return {
      success: true,
      message: 'Guest deleted successfully.',
    };
  } catch (error) {
    console.error('Delete guest error:', error);
    return {
      success: false,
      message: 'Failed to delete guest. Please try again.',
    };
  }
}

// --- Bulk Import Guests ---

export type ImportGuestsState = {
  success: boolean;
  message: string;
  importedCount?: number;
  failedCount?: number;
  /**
   * Rows dropped because their number already belongs to a guest on this event,
   * or to an earlier row in the same file. Distinct from `failedCount`, which
   * counts rows that did not survive schema validation.
   */
  skippedCount?: number;
  /** Names behind `skippedCount`, for a summary the host can act on. */
  skippedNames?: string[];
};

export async function importGuests(
  eventId: string,
  guests: ImportGuestData[],
): Promise<ImportGuestsState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to import guests',
      };
    }

    if (!guests || guests.length === 0) {
      return {
        success: false,
        message: 'No guests to import',
      };
    }

    // Validate all guests
    type ValidGuest = {
      name: string;
      phone: string | null;
      amount: number;
      side: 'bride' | 'groom' | null;
      group: string | null;
    };
    const validGuests: ValidGuest[] = [];
    const errors: string[] = [];

    for (let i = 0; i < guests.length; i++) {
      const result = ImportGuestSchema.safeParse(guests[i]);
      if (result.success) {
        validGuests.push({
          name: result.data.name,
          phone: result.data.phone || null,
          amount: result.data.amount,
          side: result.data.side ?? null,
          group: result.data.group ?? null,
        });
      } else {
        const rawMessage = result.error.issues[0]?.message ?? 'Invalid row';
        errors.push(`Row ${i + 1}: ${resolveImportErrorMessage(rawMessage)}`);
      }
    }

    if (validGuests.length === 0) {
      return {
        success: false,
        message: 'No valid guests to import',
        failedCount: errors.length,
      };
    }

    // Duplicate phones are flagged in the import dialog, but that check runs
    // against a snapshot taken when the dialog opened and the dialog is not the
    // only way into this action. Since `guests_event_id_phone_number_key` makes
    // a duplicate fail the whole insert, one stale row would otherwise cost the
    // host every good row in the file. Drop the duplicates and import the rest.
    const existingPhones = await getEventGuestPhones(eventId);
    const seenInBatch = new Set<string>();
    const skippedNames: string[] = [];
    const guestsToImport: ValidGuest[] = [];

    for (const guest of validGuests) {
      // The unique index is partial (`where phone_number is not null`), so
      // guests with no number never collide with each other.
      if (!guest.phone) {
        guestsToImport.push(guest);
        continue;
      }

      const phoneKey = phoneComparisonKey(guest.phone);
      if (existingPhones.has(phoneKey) || seenInBatch.has(phoneKey)) {
        skippedNames.push(guest.name);
        continue;
      }

      seenInBatch.add(phoneKey);
      guestsToImport.push(guest);
    }

    if (guestsToImport.length === 0) {
      return {
        success: false,
        message:
          skippedNames.length === 1
            ? 'That guest is already on this event'
            : `All ${skippedNames.length} guests are already on this event`,
        failedCount: errors.length,
        skippedCount: skippedNames.length,
        skippedNames,
      };
    }

    const supabase = await createClient();

    // Resolve group names → group_id, auto-creating missing groups.
    // Backed by the unique index `idx_groups_event_name_side` on
    // (event_id, name, COALESCE(side, '')). The index is case-sensitive, so
    // we additionally normalize names case-insensitively in-memory to avoid
    // creating "Family" / "family" duplicates within a single import.
    const groupKey = (name: string, side: 'bride' | 'groom' | null) =>
      `${name.trim().toLowerCase()}::${side ?? ''}`;

    const desiredGroups = new Map<
      string,
      { name: string; side: 'bride' | 'groom' | null }
    >();
    for (const g of guestsToImport) {
      if (g.group) {
        const k = groupKey(g.group, g.side);
        if (!desiredGroups.has(k))
          desiredGroups.set(k, { name: g.group, side: g.side });
      }
    }

    const groupIdByKey = new Map<string, string>();

    const indexExistingGroups = (
      rows: Array<{ id: string; name: string; side: string | null }> | null,
    ) => {
      for (const g of rows ?? []) {
        groupIdByKey.set(
          groupKey(g.name, (g.side as 'bride' | 'groom' | null) ?? null),
          g.id,
        );
      }
    };

    if (desiredGroups.size > 0) {
      const { data: existingGroups, error: gFetchErr } = await supabase
        .from('groups')
        .select('id, name, side')
        .eq('event_id', eventId);

      if (gFetchErr) {
        console.error('Group fetch error:', gFetchErr);
        return {
          success: false,
          message: 'Unable to load existing groups',
        };
      }

      indexExistingGroups(existingGroups);

      const toCreate = [...desiredGroups.values()]
        .filter(({ name, side }) => !groupIdByKey.has(groupKey(name, side)))
        .map(({ name, side }) => ({ event_id: eventId, name, side }));

      if (toCreate.length > 0) {
        const { data: created, error: gInsertErr } = await supabase
          .from('groups')
          .insert(toCreate)
          .select('id, name, side');

        // 23505 = unique_violation. Another concurrent import won the race;
        // re-fetch and map. Anything still missing simply gets null group_id.
        if (gInsertErr && gInsertErr.code === '23505') {
          const { data: refetched, error: refetchErr } = await supabase
            .from('groups')
            .select('id, name, side')
            .eq('event_id', eventId);

          if (refetchErr) {
            console.error('Group refetch error:', refetchErr);
            return {
              success: false,
              message: 'Unable to load existing groups',
            };
          }

          indexExistingGroups(refetched);
        } else if (gInsertErr) {
          console.error('Group insert error:', gInsertErr);
          return {
            success: false,
            message: 'Unable to create groups',
          };
        } else {
          indexExistingGroups(created);
        }
      }
    }

    const guestsToInsert = guestsToImport.map((g) => ({
      name: g.name,
      // Bulk import bypasses AppToDbTransformerSchema, so it canonicalises here
      // instead - the `CHECK` constraint on the column rejects anything else.
      phone_number: g.phone ? toE164(g.phone) : null,
      amount: g.amount,
      event_id: eventId,
      side: g.side,
      group_id: g.group
        ? (groupIdByKey.get(groupKey(g.group, g.side)) ?? null)
        : null,
    }));

    const { error } = await supabase.from('guests').insert(guestsToInsert);

    if (error) {
      console.error('Supabase insert error:', error);
      // 23505 is unique_violation. The filter above removes every duplicate we
      // can see, so reaching here means one was created between that read and
      // this insert - a concurrent import or a guest added in another tab.
      // Name the cause rather than reporting a generic save failure.
      return {
        success: false,
        message:
          error.code === '23505'
            ? 'One of these guests was just added by someone else - reopen the import to try again'
            : 'Unable to save guests',
      };
    }

    revalidatePath(`/app/${eventId}/guests`);

    const importedCount = guestsToImport.length;

    return {
      success: true,
      message: `Successfully imported ${importedCount} guest${importedCount === 1 ? '' : 's'}`,
      importedCount,
      failedCount: errors.length,
      skippedCount: skippedNames.length,
      skippedNames,
    };
  } catch (error) {
    console.error('Import guests error:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? `Failed to import guests: ${error.message}`
          : 'Failed to import guests. Please try again.',
    };
  }
}
