import { ADMIN_TIME_ZONE } from '@/lib/date-time';

import { nextOpenSlot, type SendWindow } from './send-window';
import { offsetDays } from './timeline';

/**
 * The two guards on an organiser editing a Due Time (backlog 0014).
 *
 * Both are pure so the page and `updateScheduledDate` apply the same rule, and
 * both read the calendar in Israel, where the Due Time was authored and where
 * the Dispatcher evaluates it - never in the browser's zone.
 */

const HOUR_MS = 3_600_000;

/** The one Schedule that is meant to go out after the Event. */
const AFTER_EVENT_TYPE_KEY = 'post_event';

export type DueTimeRules = {
  sendWindow: SendWindow;
  /** How long past its Due Time a Schedule may be before it expires unsent. */
  maxLatenessHours: number;
};

const ISRAEL_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: ADMIN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * The last Israel calendar day a Schedule may be due on, "YYYY-MM-DD", or null
 * when there is no such limit.
 *
 * The Event day itself is allowed - the Event Reminder is seeded at day 0.
 * The Thank You is excepted for the same reason `expiryReason` excepts it.
 */
export function lastDueDay(
  eventDate: string | null,
  scheduleTypeKey: string,
): string | null {
  if (!eventDate || scheduleTypeKey === AFTER_EVENT_TYPE_KEY) return null;
  // event_date is a calendar date pinned at 00:00 UTC, so its UTC day is the
  // day the organiser picked.
  return eventDate.slice(0, 10);
}

/** Whether a Due Time falls on an Israel calendar day after the Event. */
export function isDueAfterEvent(params: {
  eventDate: string | null;
  scheduleTypeKey: string;
  scheduledDate: string;
}): boolean {
  if (!lastDueDay(params.eventDate, params.scheduleTypeKey)) return false;
  const offset = offsetDays(params.eventDate, params.scheduledDate);
  return offset !== null && offset > 0;
}

/**
 * The first Israel calendar day that can still hold a sendable Due Time,
 * "YYYY-MM-DD". Every instant on an earlier day is more than the lateness
 * limit ago, so the Dispatcher would expire it rather than send it.
 */
export function firstSendableDay(now: Date, maxLatenessHours: number): string {
  return ISRAEL_DAY.format(new Date(now.getTime() - maxLatenessHours * HOUR_MS));
}

/**
 * What the Dispatcher will do with a Due Time that has already passed.
 *
 * - `sendsNow`: the Send Window is open, so the next run (within a minute)
 *   dispatches it.
 * - `heldUntil`: the window is closed, so it goes out when it next opens.
 * - `expires`: by the time the window opens it is past the lateness limit, so
 *   it would be expired and never sent - and an expired Schedule can no longer
 *   be edited, so this is refused rather than confirmed.
 */
export type PastDueTime =
  | { kind: 'sendsNow' }
  | { kind: 'heldUntil'; opensAt: string }
  | { kind: 'expires' };

/** Null when the Due Time is still ahead; otherwise what happens on save. */
export function pastDueTime(
  scheduledDate: string,
  now: Date,
  rules: DueTimeRules,
): PastDueTime | null {
  const due = Date.parse(scheduledDate);
  if (!Number.isFinite(due) || due >= now.getTime()) return null;

  // Mirrors the Dispatcher: the lateness check runs when it next looks at the
  // Schedule, which for a closed window is when the window opens.
  const sendAt = nextOpenSlot(now, rules.sendWindow);
  if (sendAt.getTime() - due > rules.maxLatenessHours * HOUR_MS) {
    return { kind: 'expires' };
  }
  if (sendAt.getTime() === now.getTime()) return { kind: 'sendsNow' };
  return { kind: 'heldUntil', opensAt: sendAt.toISOString() };
}

export type DueTimeIssue = 'afterEvent' | 'expires';

/**
 * Why a Due Time cannot be saved at all, or null when it can (possibly after
 * the past-time confirmation). The one check both the page and the Server
 * Action run.
 */
export function dueTimeIssue(params: {
  eventDate: string | null;
  scheduleTypeKey: string;
  scheduledDate: string;
  now: Date;
  rules: DueTimeRules;
}): DueTimeIssue | null {
  if (isDueAfterEvent(params)) return 'afterEvent';
  if (pastDueTime(params.scheduledDate, params.now, params.rules)?.kind === 'expires') {
    return 'expires';
  }
  return null;
}
