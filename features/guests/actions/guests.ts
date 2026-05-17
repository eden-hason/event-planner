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
    // Coerce boolean string from FormData
    if (parsedData.isOfflineRsvp !== undefined) {
      parsedData.isOfflineRsvp = parsedData.isOfflineRsvp === 'true';
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

        // Clear offline RSVP flag when status is reverted to pending
        if (dbData.rsvp_status === 'pending') {
          dbData.is_offline_rsvp = false;
        }
      }
    }

    const { error } = await supabase.from('guests').upsert(
      {
        ...dbData,
        event_id: eventId,
      },
      {
        onConflict: 'id',
      },
    );

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not upsert guest.',
      };
    }

    revalidatePath('/app/guests');
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

    const { error } = await supabase.from('guests').delete().eq('id', guestId);

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not delete guest.',
      };
    }

    revalidatePath('/app/guests');
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
    for (const g of validGuests) {
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

    const guestsToInsert = validGuests.map((g) => ({
      name: g.name,
      phone_number: g.phone,
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
      return {
        success: false,
        message: 'Unable to save guests',
      };
    }

    revalidatePath(`/app/${eventId}/guests`);

    return {
      success: true,
      message: `Successfully imported ${validGuests.length} guest${validGuests.length === 1 ? '' : 's'}`,
      importedCount: validGuests.length,
      failedCount: errors.length,
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
