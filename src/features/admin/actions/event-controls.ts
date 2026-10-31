'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { sendingConfig } from '@/lib/config/sending';
import { israelWallClockToIso } from '@/lib/date-time';
import { dueTimeIssue, type DueTimeIssue } from '@/features/schedules';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import { dispatchScheduleById } from '@/features/schedules/services/dispatch-schedules';
import { nudgeWorker } from '@/features/schedules/services/nudge-worker';
import type { Location } from '@/features/events/schemas';
import { VENUE_NAME_MAX } from '../utils/venue';
import {
  conversionRejection,
  deletionRejection,
  dueTimeRejection,
  sendNowRejection,
  type ScheduleControlState,
} from '../utils/schedule-controls';

export type EventControlResult = { success: boolean; message: string };

/** Why a Due Time cannot be saved, as the Operator reads it. */
const DUE_TIME_ISSUE_MESSAGES: Record<DueTimeIssue, string> = {
  afterEvent: 'צריך לבחור תאריך עד יום האירוע',
  notBeforeEvent: 'צריך לבחור תאריך עד יום לפני האירוע',
  expires: 'המועד הזה רחוק מדי בעבר כדי לשלוח - צריך לבחור מועד מאוחר יותר',
};


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
    // A call plan is started by a person, so a past date only reads as overdue.
    if (issue && !(issue === 'expires' && schedule.state.kind === 'call')) {
      return { success: false, message: DUE_TIME_ISSUE_MESSAGES[issue] };
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
 * Sends a Schedule now from the Back Office, outside the Send Window if need be.
 *
 * The Owner's send-now waits for the window; this one does not, because an
 * Operator chose the hour (`dispatchScheduleById`). It moves the Due Time to
 * now first, as the Owner's does, so the Schedule reads as sent when it was and
 * a dispatch that fails is picked up by the ordinary sweep rather than stranded.
 */
export async function sendScheduleNowAdmin(scheduleId: string): Promise<EventControlResult> {
  await assertAdmin();
  try {
    const schedule = await readScheduleControlState(scheduleId);
    if (!schedule) return { success: false, message: 'התזמון לא נמצא' };

    const rejection = sendNowRejection(schedule.state);
    if (rejection) return { success: false, message: rejection };

    const supabase = createServiceClient();
    const now = new Date();
    const { error } = await supabase
      .from('schedules')
      .update({ scheduled_date: now.toISOString() })
      .eq('id', scheduleId)
      .is('status', null)
      .is('dispatched_at', null);
    if (error) {
      console.error('sendScheduleNowAdmin failed:', error);
      return { success: false, message: 'לא הצלחנו להעביר את התזמון לעכשיו' };
    }

    const result = await dispatchScheduleById(supabase, scheduleId, { now, ignoreSendWindow: true });
    revalidateOutreach(schedule.eventId);

    if (result.outcome !== 'dispatched') {
      // The reason is the Dispatcher's own, in English, as the dispatch log has it.
      return { success: false, message: `לא נשלח: ${result.reason ?? result.outcome}` };
    }
    await nudgeWorker();
    const count = result.deliveriesQueued;
    return {
      success: true,
      message: count === 1 ? 'יוצא לאורח אחד' : `יוצא ל-${count} אורחים`,
    };
  } catch (error) {
    console.error('sendScheduleNowAdmin failed:', error);
    return { success: false, message: 'לא הצלחנו לשלוח את התזמון' };
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
 * Deletes an Initial Invitation, Advance Reminder or Event Reminder that has not
 * gone out. Its Deliveries, Guest replies and Dispatcher log cascade with it, so
 * it also refuses one with any Delivery or reply on record - those stay as
 * history. The plan then reads without it: an Invitation as after a conversion
 * (ADR 0036), an Event Reminder as an Event reminded only in advance (ADR 0051).
 */
export async function deleteUnsentScheduleAdmin(
  scheduleId: string,
): Promise<EventControlResult> {
  await assertAdmin();
  try {
    const schedule = await readScheduleControlState(scheduleId);
    if (!schedule) return { success: false, message: 'התזמון לא נמצא' };

    const rejection = deletionRejection(schedule.state);
    if (rejection) return { success: false, message: rejection };

    const supabase = createServiceClient();
    const [deliveries, interactions] = await Promise.all([
      supabase.from('message_deliveries').select('id', { count: 'exact', head: true }).eq('schedule_id', scheduleId),
      supabase.from('guest_interactions').select('id', { count: 'exact', head: true }).eq('schedule_id', scheduleId),
    ]);
    if (deliveries.error) throw new Error(deliveries.error.message);
    if (interactions.error) throw new Error(interactions.error.message);
    if ((deliveries.count ?? 0) > 0 || (interactions.count ?? 0) > 0) {
      return { success: false, message: 'כבר יש שליחות או תשובות של אורחים לתזמון הזה' };
    }

    // Guarded again in the delete itself, so a claim by the Dispatcher since the
    // read above leaves the row in place.
    const { data: deleted, error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', scheduleId)
      .is('dispatched_at', null)
      .is('sent_at', null)
      .select('id');
    if (error) {
      console.error('deleteUnsentScheduleAdmin failed:', error);
      return { success: false, message: 'לא הצלחנו למחוק את התזמון' };
    }
    if (!deleted?.length) return { success: false, message: 'התזמון הזה כבר נשלח' };

    revalidateOutreach(schedule.eventId);
    return { success: true, message: 'התזמון נמחק' };
  } catch (error) {
    console.error('deleteUnsentScheduleAdmin failed:', error);
    return { success: false, message: 'לא הצלחנו למחוק את התזמון' };
  }
}

export type CreateAdvanceReminderInput = {
  eventId: string;
  /** `YYYY-MM-DD` from the date field */
  scheduledDate: string;
  /** `HH:MM` from the time field */
  scheduledTime: string;
};

const ADVANCE_REMINDER_TYPE_KEY = 'advance_reminder';

/** The family every Advance Reminder is anchored on (20261031000000_advance_reminder.sql). */
const ADVANCE_REMINDER_FAMILY_KEY = 'advance_reminder_1';

/**
 * Gives one Event an Advance Reminder: a reminder before the Event day, to every
 * Guest who has not declined (ADR 0051). No Event Type is seeded one, so this is
 * the only way an Event gets it. It is included in the Plan, so nothing is
 * charged. An Event already planning one is refused rather than given a second.
 *
 * Locked like the seeded plan while the Event cannot send ('disabled'), so it
 * arms with the rest of the plan when payment turns sending on.
 */
export async function createAdvanceReminderAdmin(
  input: CreateAdvanceReminderInput,
): Promise<EventControlResult> {
  await assertAdmin();
  try {
    const scheduledDate = israelWallClockToIso(input.scheduledDate, input.scheduledTime);
    if (!scheduledDate) return { success: false, message: 'התאריך והשעה לא תקינים' };

    const supabase = createServiceClient();
    const [eventResult, typeResult, anchorResult, existingResult] = await Promise.all([
      supabase
        .from('events')
        .select('status, event_date, can_create_schedules')
        .eq('id', input.eventId)
        .maybeSingle(),
      supabase.from('schedule_types').select('id').eq('key', ADVANCE_REMINDER_TYPE_KEY).maybeSingle(),
      // The confirmed Guests' WhatsApp row. The resolver reads the whole family
      // from it, so which row anchors does not change what is sent.
      supabase
        .from('message_templates')
        .select('id')
        .eq('key', ADVANCE_REMINDER_FAMILY_KEY)
        .eq('channel', 'whatsapp')
        .eq('requires_rsvp_ask', false)
        .is('event_id', null)
        .maybeSingle(),
      supabase
        .from('schedules')
        .select('id, schedule_types!inner(key)', { count: 'exact', head: true })
        .eq('event_id', input.eventId)
        .eq('schedule_types.key', ADVANCE_REMINDER_TYPE_KEY),
    ]);
    for (const result of [eventResult, typeResult, anchorResult, existingResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const event = eventResult.data;
    if (!event) return { success: false, message: 'האירוע לא נמצא' };
    // A Draft Event cannot have schedules - it is interest, not an event.
    if (event.status !== 'published') return { success: false, message: 'האירוע הזה לא פורסם' };
    if (!event.event_date) return { success: false, message: 'לאירוע הזה אין תאריך' };
    if ((existingResult.count ?? 0) > 0) {
      return { success: false, message: 'כבר יש לאירוע הזה תזכורת מוקדמת' };
    }
    if (!typeResult.data || !anchorResult.data) {
      console.error('createAdvanceReminderAdmin: the Advance Reminder is missing from the catalog');
      return { success: false, message: 'אין בקטלוג תזכורת מוקדמת' };
    }

    const config = sendingConfig();
    const issue = dueTimeIssue({
      eventDate: event.event_date,
      scheduleTypeKey: ADVANCE_REMINDER_TYPE_KEY,
      scheduledDate,
      now: new Date(),
      rules: { sendWindow: config.sendWindow, maxLatenessHours: config.scheduleMaxLatenessHours },
    });
    if (issue) return { success: false, message: DUE_TIME_ISSUE_MESSAGES[issue] };

    const { error } = await supabase.from('schedules').insert({
      event_id: input.eventId,
      schedule_type_id: typeResult.data.id,
      template_id: anchorResult.data.id,
      // One Due Time: the wall clock is already folded into the instant above
      // by israelWallClockToIso (ADR 0015).
      scheduled_date: scheduledDate,
      target_status: 'not_declined',
      status: event.can_create_schedules ? null : 'disabled',
    });
    if (error) {
      console.error('createAdvanceReminderAdmin failed:', error);
      return { success: false, message: 'לא הצלחנו להוסיף את התזכורת' };
    }

    revalidateOutreach(input.eventId);
    return { success: true, message: 'התזכורת המוקדמת נוספה' };
  } catch (error) {
    console.error('createAdvanceReminderAdmin failed:', error);
    return { success: false, message: 'לא הצלחנו להוסיף את התזכורת' };
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

/**
 * Sets or clears an SMS Fallback Opt-out (CONTEXT.md), at the Owner's request.
 * Read live by the Fallback engine and the sweeper, so clearing it lets the
 * ordinary rules pick up failures from while it held.
 */
export async function setEventSmsFallbackAdmin(
  eventId: string,
  enabled: boolean,
): Promise<EventControlResult> {
  await assertAdmin();
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('events')
      .update({ sms_fallback_enabled: enabled })
      .eq('id', eventId)
      .select('id');
    if (error) {
      console.error('setEventSmsFallbackAdmin failed:', error);
      return { success: false, message: 'לא הצלחנו לעדכן את השליחה ב-SMS' };
    }
    if (!data?.length) return { success: false, message: 'האירוע הזה כבר לא קיים' };

    revalidateOutreach(eventId);
    return {
      success: true,
      message: enabled ? 'SMS יישלח שוב לאורחים שהוואטסאפ לא הגיע אליהם' : 'האירוע בוואטסאפ בלבד - בלי SMS',
    };
  } catch (error) {
    console.error('setEventSmsFallbackAdmin failed:', error);
    return { success: false, message: 'לא הצלחנו לעדכן את השליחה ב-SMS' };
  }
}
