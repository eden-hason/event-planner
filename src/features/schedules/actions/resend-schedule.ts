'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '../services/revalidate-outreach';
import { sendSchedule } from '../services/send-schedule';

export type ResendScheduleResult = {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
};

export async function resendScheduleToSelected(
  scheduleId: string,
  guestIds: string[],
): Promise<ResendScheduleResult> {
  await assertAdmin();
  const supabase = createServiceClient();
  const selected = [...new Set(guestIds)].slice(0, 500);
  if (!selected.length) return { success: false, message: 'Select at least one delivery' };

  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select('id, event_id, status, schedule_types!inner(execution_kind), events!inner(can_create_schedules)')
    .eq('id', scheduleId)
    .single();
  if (scheduleError || !schedule) return { success: false, message: 'That schedule no longer exists' };
  const scheduleType = (Array.isArray(schedule.schedule_types)
    ? schedule.schedule_types[0]
    : schedule.schedule_types) as { execution_kind: string } | null;
  if (schedule.status !== 'sent' || scheduleType?.execution_kind !== 'message') {
    return { success: false, message: 'Only sent message schedules can be resent' };
  }
  const event = (Array.isArray(schedule.events) ? schedule.events[0] : schedule.events) as { can_create_schedules: boolean } | null;
  if (!event?.can_create_schedules) {
    return { success: false, message: 'Sending is not enabled for this event' };
  }

  const { data: deliveries, error: deliveriesError } = await supabase
    .from('message_deliveries')
    .select('guest_id')
    .eq('schedule_id', scheduleId)
    .in('guest_id', selected);
  if (deliveriesError) throw new Error(deliveriesError.message);
  const allowed = new Set((deliveries ?? []).map((delivery) => delivery.guest_id));
  if (allowed.size !== selected.length) {
    return { success: false, message: 'One or more selected deliveries do not belong to this send' };
  }

  const outcome = await sendSchedule(scheduleId, {
    supabase,
    triggeredBy: 'manual',
    claim: 'none',
    guestIds: selected,
    markSentOnSuccess: false,
  });
  revalidateOutreach(schedule.event_id);
  return {
    success: outcome.success,
    message: outcome.message,
    sentCount: outcome.sentCount,
    failedCount: outcome.failedCount,
  };
}
