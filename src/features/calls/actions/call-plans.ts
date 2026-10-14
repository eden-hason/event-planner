'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import { israelWallClockToIso } from '@/lib/date-time';
import { loadCallRoundEventIds } from '@/features/billing/services';

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
      return { success: false, message: 'אין בקטלוג סוג של סבב שיחות' };
    }

    // A Draft Event cannot have schedules - it is interest, not an event.
    const { data: event } = await supabase
      .from('events')
      .select('status, can_create_schedules')
      .eq('id', input.eventId)
      .single();

    if (event?.status !== 'published') {
      return { success: false, message: 'האירוע הזה לא פורסם' };
    }
    if (!event.can_create_schedules) {
      return { success: false, message: 'השליחה לא מופעלת לאירוע הזה' };
    }

    // Call Rounds are what the WhatsApp + calls Plan adds (ADR 0034).
    const callEvents = await loadCallRoundEventIds(supabase, [input.eventId]);
    if (!callEvents) {
      return { success: false, message: 'לא הצלחנו לבדוק את חבילת הרשומות' };
    }
    if (!callEvents.has(input.eventId)) {
      return { success: false, message: 'החבילה של האירוע הזה היא וואטסאפ בלי שיחות' };
    }

    // No audience check: a plan is only a date and a target. Who gets called
    // is snapshotted when the round starts, so an empty list today is fine.

    const scheduledDate = israelWallClockToIso(input.scheduledDate, input.scheduledTime);
    if (!scheduledDate) {
      return { success: false, message: 'התאריך והשעה לא תקינים' };
    }

    const { error } = await supabase.from('schedules').insert({
      event_id: input.eventId,
      schedule_type_id: callType.id,
      template_id: null,
      // One Due Time: the wall clock is already folded into the instant above
      // by israelWallClockToIso (ADR 0015).
      scheduled_date: scheduledDate,
      target_status: input.targetStatus,
      status: null,
    });

    if (error) {
      console.error('Failed to create call plan:', error);
      return { success: false, message: 'יצירת התוכנית נכשלה' };
    }

    revalidateOutreach(input.eventId);
    return { success: true, message: 'תוכנית השיחות נוצרה' };
  } catch (error) {
    console.error('createCallPlan failed:', error);
    return { success: false, message: 'יצירת התוכנית נכשלה' };
  }
}
