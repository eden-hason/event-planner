'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/features/auth/queries';
import { assertNotImpersonating } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { GiftingSettingsUpdateSchema } from '../schemas';
// Deep import: pure, and the schedules barrel carries the send path.
import { GIFT_BUTTON_SCHEDULE_TYPES } from '@/features/schedules/utils/event-config';

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
    const onMessagePlan = row.message_plan === 'current';
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
 * Schedule already dispatched is history and keeps what it sent with.
 */
async function saveScheduleGiftButtons(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  giftButtons: Partial<Record<string, boolean>>,
): Promise<boolean> {
  for (const [scheduleTypeKey, on] of Object.entries(giftButtons)) {
    if (typeof on !== 'boolean') continue;
    if (!(GIFT_BUTTON_SCHEDULE_TYPES as readonly string[]).includes(scheduleTypeKey)) continue;
    const { data, error } = await supabase
      .from('schedules')
      .select('id, schedule_types!inner (key)')
      .eq('event_id', eventId)
      .eq('schedule_types.key', scheduleTypeKey)
      .is('dispatched_at', null);
    if (error) {
      console.error('updateGiftingSettings: could not read the schedules', error);
      return false;
    }
    const ids = (data ?? []).map((row) => row.id as string);
    if (!ids.length) continue;
    const { error: updateError } = await supabase
      .from('schedules')
      .update({ gift_button: on })
      .in('id', ids);
    if (updateError) {
      console.error('updateGiftingSettings: could not save the gift button', updateError);
      return false;
    }
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
