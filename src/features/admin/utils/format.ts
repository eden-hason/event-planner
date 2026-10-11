import { ADMIN_TIME_ZONE } from '@/lib/date-time';

/**
 * Hebrew dates and spans for the Back Office (ADR 0037). The shared
 * `formatScheduleDateTime` in `@/lib/date-time` stays English because the
 * Dispatcher writes it into a stored reason; the Back Office formats through
 * here. Formatters are built once, not per call - these run per table row.
 */

const LOCALE = 'he-IL';

const EVENT_DAY = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
const EVENT_DAY_NO_YEAR = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', day: 'numeric', month: 'short' });
const EVENT_DAY_WEEKDAY = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const FULL_DAY = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
const ISRAEL_DAY = new Intl.DateTimeFormat(LOCALE, { timeZone: ADMIN_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' });
const ISRAEL_DAY_NO_YEAR = new Intl.DateTimeFormat(LOCALE, { timeZone: ADMIN_TIME_ZONE, day: 'numeric', month: 'short' });
const ISRAEL_TIME = new Intl.DateTimeFormat(LOCALE, { timeZone: ADMIN_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** "יום ה׳ 12 בנוב׳ 2026" - an Event date, a calendar day pinned at 00:00 UTC. */
export function formatEventDate(
  eventDate: string | null,
  options?: { year?: boolean; weekday?: boolean },
): string {
  if (!eventDate) return 'ללא תאריך';
  const formatter = options?.weekday ? EVENT_DAY_WEEKDAY : options?.year === false ? EVENT_DAY_NO_YEAR : EVENT_DAY;
  return formatter.format(new Date(eventDate)).replace(',', '');
}

/** "12 בנובמבר 2026" - the full-month form, where a date stands alone. */
export function formatFullDate(iso: string): string {
  return FULL_DAY.format(new Date(iso));
}

/** The date part of an instant, in Israel: "12 בנוב׳ 2026". */
export function formatShortDate(iso: string, options?: { year?: boolean }): string {
  return (options?.year === false ? ISRAEL_DAY_NO_YEAR : ISRAEL_DAY).format(new Date(iso));
}

/** A Due Time or any other instant, in Israel: "12 בנוב׳ 2026, 10:00". */
export function formatDateTime(iso: string): string {
  return `${formatShortDate(iso)}, ${ISRAEL_TIME.format(new Date(iso))}`;
}

/** "שעה", "שעתיים", "5 שעות" - Hebrew has a dual, so 2 is a word of its own. */
export function hoursText(hours: number): string {
  return hours === 1 ? 'שעה' : hours === 2 ? 'שעתיים' : `${hours} שעות`;
}

/** "יום", "יומיים", "5 ימים". */
export function daysText(days: number): string {
  return days === 1 ? 'יום' : days === 2 ? 'יומיים' : `${days} ימים`;
}

/** "היום", "בעוד 3 ימים", "לפני 5 ימים". */
export function relativeEventDate(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return 'היום';
  if (days === 1) return 'מחר';
  if (days === -1) return 'אתמול';
  return days > 0 ? `בעוד ${daysText(days)}` : `לפני ${daysText(-days)}`;
}
