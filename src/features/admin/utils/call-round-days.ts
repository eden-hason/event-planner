import { israelToday, israelWallClockParts, israelWallClockToIso } from '@/lib/date-time';
import type { CallRoundDay } from '../types';

const DAY_MS = 86_400_000;

/** The Overview's Call Rounds band shows today and this many days after it. */
export const CALL_ROUND_DAYS_AHEAD = 7;

const NAMED_DAYS = ['היום', 'מחר', 'מחרתיים'];

// The keys are Israel calendar dates already, so they are formatted as UTC
// midnights in UTC - formatting them in Israel time would be a second shift.
const WEEKDAY = new Intl.DateTimeFormat('he-IL', { timeZone: 'UTC', weekday: 'short' });
const SHORT_DATE = new Intl.DateTimeFormat('he-IL', { timeZone: 'UTC', day: 'numeric', month: 'numeric' });
const FULL_DATE = new Intl.DateTimeFormat('he-IL', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function addDays(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The days an Operator can pick between, today first. "Today" is the Israel
 * calendar date, the same day every Back Office date is read in, so the list
 * turns over at local midnight whatever timezone the server runs in.
 */
export function callRoundDays(now: Date = new Date()): CallRoundDay[] {
  const today = israelToday(now);
  return Array.from({ length: CALL_ROUND_DAYS_AHEAD + 1 }, (_, offset) => {
    const key = addDays(today, offset);
    const date = new Date(`${key}T00:00:00Z`);
    const fullLabel = FULL_DATE.format(date);
    const named = NAMED_DAYS[offset];
    return {
      key,
      label: named ?? `${WEEKDAY.format(date)} ${SHORT_DATE.format(date)}`,
      fullLabel,
      phrase: named ?? `ב${fullLabel}`,
    };
  });
}

/** The instants the days cover, end exclusive. DST is handled by the wall-clock conversion. */
export function callRoundWindow(days: CallRoundDay[]): { from: string; to: string } {
  const from = israelWallClockToIso(days[0].key, '00:00');
  const to = israelWallClockToIso(addDays(days[days.length - 1].key, 1), '00:00');
  if (!from || !to) throw new Error('Could not resolve the call round window');
  return { from, to };
}

/** The Israel calendar day a Due Time falls on, as a `CallRoundDay` key. */
export function callRoundDayKey(iso: string): string {
  return israelWallClockParts(iso).date;
}
