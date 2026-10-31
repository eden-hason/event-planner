import { addCalendarDays, ADMIN_TIME_ZONE } from '@/lib/date-time';

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

/**
 * Where on the calendar a Schedule Type may be due, in days from the Event.
 * `lastDay` is the latest day it may go out (null: no limit); `pinnedDay`, when
 * set, is the one day it goes out, so only its hour is the organiser's to move.
 * A type not listed may go out up to the Event day itself.
 *
 * - The Thank You is meant to land after the Event, for the same reason
 *   `expiryReason` excepts it.
 * - The Event Reminder says "today", and would be wrong on any other day.
 * - The Advance Reminder names the Event's day instead, so it may go out on any
 *   day before it, but not on it: there the Event Reminder is the message
 *   (ADR 0051).
 */
const DUE_DAY_RULES: Partial<Record<string, { lastDay: number | null; pinnedDay?: number }>> = {
  post_event: { lastDay: null },
  event_reminder: { lastDay: 0, pinnedDay: 0 },
  advance_reminder: { lastDay: -1 },
};

function dueDayRule(scheduleTypeKey: string) {
  return DUE_DAY_RULES[scheduleTypeKey] ?? { lastDay: 0 };
}

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
 * when there is no such limit (see DUE_DAY_RULES).
 */
export function lastDueDay(
  eventDate: string | null,
  scheduleTypeKey: string,
): string | null {
  const { lastDay } = dueDayRule(scheduleTypeKey);
  // event_date is a calendar date pinned at 00:00 UTC, so its UTC day is the
  // day the organiser picked.
  return eventDate && lastDay !== null ? addCalendarDays(eventDate, lastDay) : null;
}

/**
 * The calendar day, "YYYY-MM-DD", this schedule type must go out on, or `null`
 * when the organiser picks it. Only the hour of a pinned Schedule is editable.
 */
export function pinnedDueDay(
  eventDate: string | null,
  scheduleTypeKey: string,
): string | null {
  const { pinnedDay } = dueDayRule(scheduleTypeKey);
  return eventDate && pinnedDay !== undefined ? addCalendarDays(eventDate, pinnedDay) : null;
}

/**
 * Whether a Due Time falls on an Israel calendar day after the last one its
 * Schedule may be due on (see lastDueDay).
 */
export function isDueAfterLastDay(params: {
  eventDate: string | null;
  scheduleTypeKey: string;
  scheduledDate: string;
}): boolean {
  const { lastDay } = dueDayRule(params.scheduleTypeKey);
  if (lastDay === null) return false;
  const offset = offsetDays(params.eventDate, params.scheduledDate);
  return offset !== null && offset > lastDay;
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

/**
 * `afterEvent`: past the Event day. `notBeforeEvent`: on or after the Event day,
 * for a Schedule that must go out before it.
 */
export type DueTimeIssue = 'afterEvent' | 'notBeforeEvent' | 'expires';

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
  if (isDueAfterLastDay(params)) {
    return dueDayRule(params.scheduleTypeKey).lastDay === 0 ? 'afterEvent' : 'notBeforeEvent';
  }
  if (pastDueTime(params.scheduledDate, params.now, params.rules)?.kind === 'expires') {
    return 'expires';
  }
  return null;
}
