import { israelToday } from '@/lib/date-time';

const DAY_MS = 86_400_000;

/**
 * Yesterday, as the half-open range of `event_date` values that fall on it.
 *
 * `event_date` is a calendar day stored at 00:00 UTC, while "today" is read in
 * Israel time (see `daysUntil`), so the list turns over at local midnight
 * rather than at 02:00 or 03:00 on a UTC server.
 */
export function yesterdayEventDateRange(now: Date = new Date()): { start: string; end: string } {
  const todayStart = Date.parse(`${israelToday(now)}T00:00:00Z`);
  return {
    start: new Date(todayStart - DAY_MS).toISOString(),
    end: new Date(todayStart).toISOString(),
  };
}
