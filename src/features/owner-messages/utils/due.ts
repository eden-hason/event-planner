import { israelWallClockToIso } from '@/lib/date-time';

const DAY_MS = 86_400_000;

/** An automatic Owner Message more than this late is never sent (ADR 0039). */
export const OWNER_MESSAGE_MAX_LATENESS_HOURS = 48;

/** The Israel wall clock the Post-event note goes out at. */
export const POST_EVENT_TIME = '18:00';

/** Saturday, as `Date.getUTCDay` numbers it. */
const SATURDAY = 6;

/**
 * When the Post-event note is due: 18:00 Israel on the day after the Event, or
 * on Sunday when that day is a Saturday.
 *
 * `event_date` is a calendar date stored at 00:00 UTC, so its UTC date is the
 * day the Owner picked (see `daysUntil`). Null for an Event with no date.
 */
export function postEventDueAt(eventDate: string | null): string | null {
  if (!eventDate) return null;
  const day = new Date(eventDate);
  if (Number.isNaN(day.getTime())) return null;

  const start = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  let next = new Date(start + DAY_MS);
  if (next.getUTCDay() === SATURDAY) next = new Date(next.getTime() + DAY_MS);

  return israelWallClockToIso(next.toISOString().slice(0, 10), POST_EVENT_TIME);
}

/** True once the due time has come. */
export function isDue(dueAt: string, now: Date = new Date()): boolean {
  return Date.parse(dueAt) <= now.getTime();
}

/** True when the send is more than 48 hours past its due time and must not go. */
export function isTooLate(dueAt: string, now: Date = new Date()): boolean {
  return now.getTime() - Date.parse(dueAt) > OWNER_MESSAGE_MAX_LATENESS_HOURS * 3_600_000;
}
