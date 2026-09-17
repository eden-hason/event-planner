'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '../services/revalidate-outreach';
import { sendSelectedDeliveries } from '../services/manual-send';
import { sendingConfig } from '@/lib/config/sending';

export type ManualSendResult = {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
  skippedCount?: number;
};

/**
 * The Back Office's one remaining send: a handful of named Deliveries, sent
 * synchronously so the Operator sees the outcome.
 *
 * Bulk sending is gone (ADR 0013). The governor lives in the Worker now and
 * cannot govern anything that does not go through the queue, so a path that
 * sends outside it is only safe while it is small - ten Guests overshoots the
 * pace by an amount that stays under Meta's ceiling. The cap is enforced here
 * in code, and refused rather than silently truncated: an Operator who selected
 * forty guests and was told "sent" would have no idea thirty never went.
 */
export async function sendSelectedDeliveriesAdmin(
  scheduleId: string,
  guestIds: string[],
): Promise<ManualSendResult> {
  await assertAdmin();
  const supabase = createServiceClient();
  const { maxManualRecipients } = sendingConfig();

  const selected = [...new Set(guestIds)];
  if (selected.length === 0) {
    return { success: false, message: 'Select at least one delivery' };
  }
  if (selected.length > maxManualRecipients) {
    return {
      success: false,
      message: `Select at most ${maxManualRecipients} guest records - larger sends go through a schedule`,
    };
  }

  const { data: schedule, error } = await supabase
    .from('schedules')
    .select('id, event_id, events!inner(can_create_schedules)')
    .eq('id', scheduleId)
    .maybeSingle();
  if (error || !schedule) {
    return { success: false, message: 'That schedule no longer exists' };
  }
  const event = (Array.isArray(schedule.events) ? schedule.events[0] : schedule.events) as
    | { can_create_schedules: boolean }
    | null;
  if (!event?.can_create_schedules) {
    return { success: false, message: 'Sending is not enabled for this event' };
  }

  const outcome = await sendSelectedDeliveries(supabase, scheduleId, selected);
  revalidateOutreach(schedule.event_id);
  return outcome;
}
