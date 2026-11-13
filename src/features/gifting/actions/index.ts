'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/features/auth/queries';
import { assertNotImpersonating } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { GiftingSettingsUpdateSchema } from '../schemas';
// Deep import: pure, and the schedules barrel carries the send path.
import { GIFT_BUTTON_SCHEDULE_TYPES } from '@/features/schedules/utils/event-config';
import { parseMessagePlan } from '@/features/schedules/utils/message-plan-kind';

export type GiftingActionState = {
  success: boolean;
  message?: string | null;
};

/**
 * Save the PayBox and/or Bit connection for an event, and which messages carry
 * the gift button. Only the blocks present in `formData` are written; the rest
 * of `event_settings` (including the other provider) is read back and
 * preserved, so the cards and the toggles can save independently without
 * clobbering each other. `giftButtons` merges per key for the same reason.
 *
 * RLS on `events` enforces that the caller owns / collaborates on the row - no
 * manual ownership check here (see CLAUDE.md).
 */
export async function updateGiftingSettings(
  formData: FormData,
): Promise<GiftingActionState> {
  const blocked = await assertNotImpersonating();
  if (blocked) return { success: false, message: blocked };

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in' };
    }

    const raw = Object.fromEntries(formData);
    const parsed = {
      eventId: raw.eventId,
      payboxConfig:
        typeof raw.payboxConfig === 'string'
          ? safeJson(raw.payboxConfig)
          : undefined,
      bitConfig:
        typeof raw.bitConfig === 'string' ? safeJson(raw.bitConfig) : undefined,
      giftButtons:
        typeof raw.giftButtons === 'string'
          ? safeJson(raw.giftButtons)
          : undefined,
    };

    const validation = GiftingSettingsUpdateSchema.safeParse(parsed);
    if (!validation.success) {
      return {
        success: false,
        message: validation.error.issues[0]?.message ?? 'Invalid data',
      };
    }
    const { eventId, payboxConfig, bitConfig, giftButtons } = validation.data;

    const supabase = await createClient();

    const { data: row, error: fetchError } = await supabase
      .from('events')
      .select('event_settings, message_plan')
      .eq('id', eventId)
      .single();

    if (fetchError || !row) {
      return { success: false, message: 'Event not found' };
    }

    const current =
      (row.event_settings as Record<string, unknown> | null) ?? {};
    const next: Record<string, unknown> = { ...current };

    if (payboxConfig) {
      next.paybox_config = {
        enabled: payboxConfig.enabled,
        link: payboxConfig.link,
      };
    }
    if (bitConfig) {
      next.bit_config = {
        enabled: bitConfig.enabled,
        link: bitConfig.link,
      };
    }
    // On the current Message Plan the gift button is the Reminder's and the
    // Thank You's own switch (schedules.gift_button, ADR 0053), so the toggle
    // writes it there. The send reads only that, never event_settings.
    const onMessagePlan = parseMessagePlan(row.message_plan) === 'current';
    if (giftButtons && onMessagePlan) {
      const saved = await saveScheduleGiftButtons(supabase, eventId, giftButtons);
      if (!saved) return { success: false, message: 'Could not save. Please try again' };
    } else if (giftButtons) {
      next.gift_buttons = {
        ...((current.gift_buttons as Record<string, boolean> | undefined) ??
          {}),
        ...giftButtons,
      };
    }

    const { error } = await supabase
      .from('events')
      .update({ event_settings: next })
      .eq('id', eventId);

    if (error) {
      console.error('updateGiftingSettings:', error);
      return { success: false, message: 'Could not save. Please try again' };
    }

    revalidatePath('/app');
    revalidatePath(`/app/${eventId}/gifting`);
    revalidatePath(`/app/${eventId}/schedules`);
    return { success: true };
  } catch (error) {
    console.error('updateGiftingSettings error:', error);
    return { success: false, message: 'Something went wrong' };
  }
}

/**
 * Writes the gift switch on the Event's unsent Schedules of each type. A
 * Schedule already dispatched is history and keeps what it sent with. One
 * lookup of the type ids, then one update per type, in parallel.
 */
async function saveScheduleGiftButtons(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  giftButtons: Partial<Record<string, boolean>>,
): Promise<boolean> {
  const wanted = Object.entries(giftButtons).filter(
    (entry): entry is [string, boolean] =>
      typeof entry[1] === 'boolean' && GIFT_BUTTON_SCHEDULE_TYPES.includes(entry[0]),
  );
  if (!wanted.length) return true;

  const { data: types, error } = await supabase
    .from('schedule_types')
    .select('id, key')
    .in('key', wanted.map(([key]) => key));
  if (error) {
    console.error('updateGiftingSettings: could not read the schedule types', error);
    return false;
  }
  const typeId = new Map((types ?? []).map((row) => [row.key as string, row.id as string]));

  const results = await Promise.all(
    wanted.flatMap(([key, on]) => {
      const id = typeId.get(key);
      return id
        ? [
            supabase
              .from('schedules')
              .update({ gift_button: on })
              .eq('event_id', eventId)
              .eq('schedule_type_id', id)
              .is('dispatched_at', null),
          ]
        : [];
    }),
  );
  const failed = results.find((result) => result.error);
  if (failed) {
    console.error('updateGiftingSettings: could not save the gift button', failed.error);
    return false;
  }
  return true;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
