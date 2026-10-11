'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { sendingConfig } from '@/lib/config/sending';
import { dueTimeIssue } from '@/features/schedules';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import type { Location } from '@/features/events/schemas';
import { VENUE_NAME_MAX } from '../utils/venue';
import { conversionRejection, dueTimeRejection, type ScheduleControlState } from '../utils/schedule-controls';

export type EventControlResult = { success: boolean; message: string };


function one<T>(value: T | T[] | null | undefined): T | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

async function readScheduleControlState(scheduleId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('schedules')
    .select('id, event_id, status, sent_at, dispatched_at, schedule_types(key, execution_kind), events(event_date), call_rounds(id)')
    .eq('id', scheduleId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const type = one(data.schedule_types as unknown as { key: string; execution_kind: string } | null);
  const event = one(data.events as unknown as { event_date: string | null } | null);
  const state: ScheduleControlState = {
    scheduleTypeKey: type?.key ?? '',
    kind: type?.execution_kind === 'phone_call' ? 'call' : 'message',
    status: data.status,
    dispatchedAt: data.dispatched_at,
    sentAt: data.sent_at,
    hasRound: ((data.call_rounds as { id: string }[] | null) ?? []).length > 0,
  };
  return { eventId: data.event_id, eventDate: event?.event_date ?? null, state };
}

/**
 * Sets a Schedule's Due Time from the Back Office. The same guards as the
 * Owner's `updateScheduledDate` - not after the Event, not so far past that the
 * Dispatcher would expire it - except that a call plan, which a person starts,
 * may be dated in the past and simply reads as overdue.
 */
export async function setScheduleDueTimeAdmin(
  scheduleId: string,
  scheduledDate: string,
): Promise<EventControlResult> {
  await assertAdmin();
  if (!Number.isFinite(Date.parse(scheduledDate))) {
    return { success: false, message: 'התאריך לא תקין' };
  }
  try {
    const schedule = await readScheduleControlState(scheduleId);
    if (!schedule) return { success: false, message: 'התזמון לא נמצא' };

    const rejection = dueTimeRejection(schedule.state);
    if (rejection) return { success: false, message: rejection };

    const config = sendingConfig();
    const issue = dueTimeIssue({
      eventDate: schedule.eventDate,
      scheduleTypeKey: schedule.state.scheduleTypeKey,
      scheduledDate,
      now: new Date(),
      rules: { sendWindow: config.sendWindow, maxLatenessHours: config.scheduleMaxLatenessHours },
    });
    if (issue === 'afterEvent') {
      return { success: false, message: 'צריך לבחור תאריך עד יום האירוע' };
    }
    if (issue === 'expires' && schedule.state.kind === 'message') {
      return { success: false, message: 'המועד הזה רחוק מדי בעבר כדי לשלוח - צריך לבחור מועד מאוחר יותר' };
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('schedules')
      .update({ scheduled_date: scheduledDate })
      .eq('id', scheduleId);
    if (error) {
      console.error('setScheduleDueTimeAdmin failed:', error);
      return { success: false, message: 'לא הצלחנו לעדכן את מועד השליחה' };
    }

    revalidateOutreach(schedule.eventId);
    return { success: true, message: 'מועד השליחה עודכן' };
  } catch (error) {
    console.error('setScheduleDueTimeAdmin failed:', error);
    return { success: false, message: 'לא הצלחנו לעדכן את מועד השליחה' };
  }
}

/**
 * Turns an Initial Invitation into the Event's first Confirmation, so the
 * invitation itself asks for an RSVP, and narrows every other unsent
 * Confirmation that went to all guests to pending guests only. One transaction
 * - see 20261011000001_admin_convert_invitation_to_confirmation.sql.
 */
export async function convertInvitationToConfirmationAdmin(
  scheduleId: string,
): Promise<EventControlResult> {
  await assertAdmin();
  try {
    const schedule = await readScheduleControlState(scheduleId);
    if (!schedule) return { success: false, message: 'התזמון לא נמצא' };

    const rejection = conversionRejection(schedule.state);
    if (rejection) return { success: false, message: rejection };

    const supabase = createServiceClient();
    const { data: narrowed, error } = await supabase.rpc('admin_convert_invitation_to_confirmation', {
      p_schedule_id: scheduleId,
    });
    if (error) {
      console.error('convertInvitationToConfirmationAdmin failed:', error);
      return { success: false, message: 'לא הצלחנו להמיר את ההזמנה' };
    }

    revalidateOutreach(schedule.eventId);
    const count = narrowed ?? 0;
    return {
      success: true,
      message: count
        ? `ההזמנה מבקשת עכשיו אישור הגעה - ${count === 1 ? 'אישור ההגעה הבא יישלח' : `${count} אישורי ההגעה הבאים יישלחו`} רק לממתינים לתשובה`
        : 'ההזמנה מבקשת עכשיו אישור הגעה',
    };
  } catch (error) {
    console.error('convertInvitationToConfirmationAdmin failed:', error);
    return { success: false, message: 'לא הצלחנו להמיר את ההזמנה' };
  }
}

/**
 * Renames the venue as Guests read it. Only the text changes: the pinned map
 * coordinates, which drive the navigation link, are kept as they are.
 */
export async function setEventVenueNameAdmin(
  eventId: string,
  name: string,
): Promise<EventControlResult> {
  await assertAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { success: false, message: 'צריך להזין שם למקום האירוע' };
  if (trimmed.length > VENUE_NAME_MAX) {
    return { success: false, message: `שם המקום צריך להיות קצר מ-${VENUE_NAME_MAX} תווים` };
  }
  try {
    const supabase = createServiceClient();
    const { data: event, error: readError } = await supabase
      .from('events')
      .select('location')
      .eq('id', eventId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!event) return { success: false, message: 'האירוע הזה כבר לא קיים' };

    const location: Location = { ...(event.location as Location | null), name: trimmed };
    const { error } = await supabase
      .from('events')
      .update({ location })
      .eq('id', eventId);
    if (error) {
      console.error('setEventVenueNameAdmin failed:', error);
      return { success: false, message: 'לא הצלחנו לעדכן את מקום האירוע' };
    }

    revalidateOutreach(eventId);
    return { success: true, message: 'מקום האירוע עודכן' };
  } catch (error) {
    console.error('setEventVenueNameAdmin failed:', error);
    return { success: false, message: 'לא הצלחנו לעדכן את מקום האירוע' };
  }
}
