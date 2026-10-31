/**
 * What an Operator may still change on a Schedule from the Back Office, and why
 * not when they may not. Pure so the timeline (which hides the controls) and the
 * Server Actions (which refuse the write) apply one rule.
 */

export type ScheduleControlState = {
  scheduleTypeKey: string;
  kind: 'message' | 'call';
  /** The raw `schedules.status` - null, disabled, cancelled, sent or expired. */
  status: string | null;
  dispatchedAt: string | null;
  sentAt: string | null;
  /** Whether a Call Round was started from this call plan. */
  hasRound: boolean;
};

/** Sent by status, or claimed by the Dispatcher - either way it is frozen. */
function wentOut(schedule: ScheduleControlState): boolean {
  return schedule.status === 'sent' || !!schedule.dispatchedAt || !!schedule.sentAt;
}

/**
 * Why the Due Time cannot be changed, or null when it can.
 *
 * Looser than the Owner's lock rules (`editRejection`) in two ways. A locked
 * plan ('disabled', the Event cannot send yet) can be dated, so an Operator can
 * shape the plan before payment; the past-time guard at save still refuses a
 * date that would expire, though one dated close to today may fall past it by
 * the time sending is enabled and expire then (backlog 0014). And a call plan
 * can be re-dated until a round is started from it, since rescheduling calls is
 * Back Office work.
 */
export function dueTimeRejection(schedule: ScheduleControlState): string | null {
  if (wentOut(schedule)) {
    return 'התזמון הזה כבר נשלח';
  }
  if (schedule.status === 'expired') return 'פג התוקף של התזמון הזה והוא לא יישלח';
  if (schedule.kind === 'call' && schedule.hasRound) {
    return 'כבר התחיל סבב שיחות מהתוכנית הזו';
  }
  return null;
}

/**
 * Why an Operator cannot send this Schedule now, or null when they can.
 *
 * Only a message that is live: not gone out, not expired, not turned off by the
 * Owner ('cancelled') and not locked because the Event cannot send ('disabled').
 * A call plan is worked by a person, so there is nothing to dispatch.
 */
export function sendNowRejection(schedule: ScheduleControlState): string | null {
  if (schedule.kind === 'call') return 'תוכנית שיחות לא נשלחת כהודעה';
  if (wentOut(schedule)) return 'התזמון הזה כבר נשלח';
  if (schedule.status === 'expired') return 'פג התוקף של התזמון הזה והוא לא יישלח';
  if (schedule.status === 'disabled') return 'השליחה עוד לא מופעלת לאירוע הזה';
  if (schedule.status === 'cancelled') return 'בעלי האירוע כיבו את התזמון הזה';
  return null;
}

/**
 * Why this Schedule cannot be turned into the Event's first Confirmation, or
 * null when it can. Only an Initial Invitation that has not gone out converts.
 */
export function conversionRejection(schedule: ScheduleControlState): string | null {
  if (schedule.scheduleTypeKey !== 'initial_invitation') {
    return 'אפשר להמיר רק הזמנה ראשונית';
  }
  if (wentOut(schedule)) {
    return 'ההזמנה הזו כבר נשלחה';
  }
  if (schedule.status === 'expired') return 'פג התוקף של ההזמנה הזו והיא לא תישלח';
  return null;
}

/**
 * The Schedule Types an Operator may delete before they go out: the Initial
 * Invitation (ADR 0036), and either reminder, so an Event can have an Advance
 * Reminder instead of its Event Reminder, or lose one added by mistake (ADR 0051).
 */
const DELETABLE_TYPE_KEYS = new Set(['initial_invitation', 'advance_reminder', 'event_reminder']);

/**
 * Why this Schedule cannot be deleted, or null when it can. Only a deletable
 * type that has not gone out: deleting a Schedule cascades its Deliveries and
 * Guest replies, so one that reached Guests keeps its history. An expired one
 * never reached anyone, so it may go. The action also refuses one with any
 * Delivery or reply on record, which a manual send can leave without a claim.
 */
export function deletionRejection(schedule: ScheduleControlState): string | null {
  if (!DELETABLE_TYPE_KEYS.has(schedule.scheduleTypeKey)) {
    return 'אפשר למחוק רק הזמנה ראשונית או תזכורת';
  }
  if (wentOut(schedule)) {
    return 'התזמון הזה כבר נשלח';
  }
  return null;
}
