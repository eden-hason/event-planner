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
