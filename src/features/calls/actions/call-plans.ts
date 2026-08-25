'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import { israelWallClockToIso } from '@/lib/date-time';

export type CallPlanResult = { success: boolean; message: string };

export type CreateCallPlanInput = {
  eventId: string;
  /** `YYYY-MM-DD` from the date field */
  scheduledDate: string;
  /** `HH:MM` from the time field */
  scheduledTime: string;
  targetStatus: 'pending' | 'confirmed';
};

/**
 * Creates the plan only. Starting it is always a separate, deliberate act.
 *
 * One mental model everywhere: plan -> start -> record outcomes -> finish.
 * A call plan carries no template by definition, so template_id stays null and
 * the row is identified purely by its phone_call schedule type.
 */
export async function createCallPlan(input: CreateCallPlanInput): Promise<CallPlanResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    const { data: callType, error: typeError } = await supabase
      .from('schedule_types')
      .select('id')
      .eq('execution_kind', 'phone_call')
      .limit(1)
      .single();

    if (typeError || !callType) {
      console.error('No phone_call schedule type in the catalog:', typeError);
      return { success: false, message: 'The catalog has no call round type' };
    }

    // A Draft Event cannot have schedules - it is interest, not an event.
    const { data: event } = await supabase
      .from('events')
      .select('status, can_create_schedules')
      .eq('id', input.eventId)
      .single();

    if (event?.status !== 'published') {
      return { success: false, message: 'That event is not published' };
    }
    if (!event.can_create_schedules) {
      return { success: false, message: 'Sending is not enabled for that event' };
    }

    const { count: audienceCount, error: audienceError } = await supabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', input.eventId)
      .eq('rsvp_status', input.targetStatus);
    if (audienceError) throw audienceError;
    if (!audienceCount) {
      return { success: false, message: `That event has no ${input.targetStatus} guest records` };
    }

    const scheduledDate = israelWallClockToIso(input.scheduledDate, input.scheduledTime);
    if (!scheduledDate) {
      return { success: false, message: 'That date and time are not valid' };
    }

    const { error } = await supabase.from('schedules').insert({
      event_id: input.eventId,
      schedule_type_id: callType.id,
      template_id: null,
      scheduled_date: scheduledDate,
      scheduled_time: `${input.scheduledTime}:00`,
      target_status: input.targetStatus,
      status: null,
    });

    if (error) {
      console.error('Failed to create call plan:', error);
      return { success: false, message: 'Failed to create the plan' };
    }

    revalidateOutreach(input.eventId);
    return { success: true, message: 'Call plan created' };
  } catch (error) {
    console.error('createCallPlan failed:', error);
    return { success: false, message: 'Failed to create the plan' };
  }
}
