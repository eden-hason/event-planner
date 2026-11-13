/**
 * The days Kululu picks on the current Message Plan (ADR 0053): the Event
 * Reminder it proposes and the Thank You day it pins.
 *
 * Mirrors message_plan_reminder_proposal, message_plan_thank_you_due and
 * message_plan_start_time in supabase/migrations/20261113000000_message_plan.sql,
 * which seed the same Due Times. The migration's guard checks the cases
 * message-plan-dates.test.ts pins, so a change here needs the same change
 * there. The Thank You's hour is the one case only this side has: the
 * database always seeds 10:00, and only the Owner's date picker moves it.
 *
 * `eventDate` is a calendar date stored at 00:00 UTC, so its day is read in
 * UTC; the hour is an Israel wall clock, so the instant follows daylight
 * saving.
 */

import { addCalendarDays, israelWallClockToIso } from '@/lib/date-time';

/** The hour Kululu proposes for the Reminder and the Thank You. */
export const MESSAGE_PLAN_DEFAULT_TIME = '10:00';

/** An Event that starts before this is reminded the day before. */
const MORNING_EVENT_BEFORE_MINUTES = 14 * 60;

const SATURDAY = 6;

function weekday(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

/** The Event's day as YYYY-MM-DD. */
export function eventDay(eventDate: string): string {
  return new Date(eventDate).toISOString().slice(0, 10);
}

function atIsraelTime(day: string, time: string): string {
  const iso = israelWallClockToIso(day, time);
  if (!iso) throw new Error(`Not an HH:mm wall clock: ${time}`);
  return iso;
}

/** When the Event starts, for the 14:00 rule: the reception time, else the ceremony time. */
export function messagePlanStartTime(
  receptionTime: string | null | undefined,
  ceremonyTime: string | null | undefined,
): string | null {
  return receptionTime?.trim() || ceremonyTime?.trim() || null;
}

/** Whether a start time is before 14:00. Unreadable or missing counts as evening. */
function startsInTheMorning(startTime: string | null | undefined): boolean {
  const clock = /^\s*(\d{1,2}):(\d{2})/.exec(startTime ?? '');
  if (!clock) return false;
  return Number(clock[1]) * 60 + Number(clock[2]) < MORNING_EVENT_BEFORE_MINUTES;
}

/**
 * The day Kululu proposes for the Event Reminder: the Event day, or the day
 * before when the Event starts before 14:00. Never Saturday - a Saturday
 * becomes the Friday before it. The Owner may still pick Saturday.
 */
export function reminderProposalDay(
  eventDate: string,
  startTime: string | null | undefined,
): string {
  let day = eventDay(eventDate);
  if (startsInTheMorning(startTime)) day = addCalendarDays(day, -1);
  if (weekday(day) === SATURDAY) day = addCalendarDays(day, -1);
  return day;
}

/** The Event Reminder's proposed Due Time, at 10:00 Israel time, as an ISO instant. */
export function reminderProposal(
  eventDate: string,
  startTime: string | null | undefined,
): string {
  return atIsraelTime(reminderProposalDay(eventDate, startTime), MESSAGE_PLAN_DEFAULT_TIME);
}

/** The Thank You's day, fixed: the day after the Event, or Sunday when that is Saturday. */
export function thankYouDay(eventDate: string): string {
  const day = addCalendarDays(eventDay(eventDate), 1);
  return weekday(day) === SATURDAY ? addCalendarDays(day, 1) : day;
}

/** The Thank You's Due Time on its fixed day; only the hour (HH:mm, Israel) moves. */
export function thankYouDueTime(
  eventDate: string,
  time: string = MESSAGE_PLAN_DEFAULT_TIME,
): string {
  return atIsraelTime(thankYouDay(eventDate), time);
}
