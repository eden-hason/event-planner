const DAY_MS = 86_400_000;
export const ADMIN_TIME_ZONE = 'Asia/Jerusalem';

function utcCalendarStart(value: string | Date): number {
  const date = typeof value === 'string' ? new Date(value) : value;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function eventDaysFromToday(eventDate: string | null, now = new Date()): number | null {
  if (!eventDate) return null;
  return Math.round((utcCalendarStart(eventDate) - utcCalendarStart(now)) / DAY_MS);
}

/** Today's calendar date in Israel, where the product's events happen, as a UTC midnight. */
function israelCalendarStart(now: Date): number {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: ADMIN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return Date.parse(`${ymd}T00:00:00Z`);
}

/**
 * Whole days from today to a calendar date: 0 on the day, negative after it.
 *
 * `event_date` is a calendar date stored at 00:00 UTC, so its UTC date is the
 * day the Owner picked; "today" is read in Israel time so the countdown ticks
 * over at local midnight on every server and browser, rather than at 02:00 or
 * 03:00 on a UTC server.
 */
export function daysUntil(date: string, now: Date = new Date()): number {
  return Math.round((utcCalendarStart(date) - israelCalendarStart(now)) / DAY_MS);
}

export function formatEventDate(
  eventDate: string | null,
  options?: { year?: boolean; weekday?: boolean },
): string {
  if (!eventDate) return 'No date';
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    ...(options?.weekday ? { weekday: 'short' } : {}),
    day: 'numeric',
    month: 'short',
    ...(options?.year === false ? {} : { year: 'numeric' }),
  }).format(new Date(eventDate));
  return options?.weekday ? formatted.replace(',', '') : formatted;
}

/** "12 August 2026" - the full-month form used where a date stands alone, e.g. the Users sheet. */
export function formatFullDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatScheduleDateTime(iso: string, time?: string | null): string {
  const value = new Date(iso);
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: ADMIN_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
  const formattedTime = time?.slice(0, 5) ?? new Intl.DateTimeFormat('en-GB', {
    timeZone: ADMIN_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(value);
  return `${date}, ${formattedTime}`;
}

export function relativeEventDate(
  days: number | null,
  options?: { futureStyle?: 'away' | 'in' },
): string | null {
  if (days === null) return null;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0) {
    return options?.futureStyle === 'in' ? `in ${days} days` : `${days} days away`;
  }
  return `${Math.abs(days)} days ago`;
}

/** Converts an Operator-entered Israel wall clock to an instant, including DST. */
export function israelWallClockToIso(date: string, time: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !clock) return null;

  const target = Date.UTC(+match[1], +match[2] - 1, +match[3], +clock[1], +clock[2]);
  let guess = target;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ADMIN_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]),
    );
    const represented = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
    guess += target - represented;
  }
  const result = new Date(guess);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}
