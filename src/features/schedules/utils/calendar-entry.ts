/**
 * The Event as a calendar entry, for the save-the-date's "הוספה ליומן" button
 * (see /cal/[code]).
 *
 * Pure: the route reads the row and picks the delivery - an .ics file for
 * Apple and Outlook, a Google Calendar link for Android - and everything in
 * between lives here so it can be tested.
 */

import { israelWallClockToIso } from '@/lib/date-time';

/**
 * How long a timed entry lasts. The Event stores when the reception starts
 * but not when anything ends, and an entry with no end shows as a zero-length
 * blip; five hours covers a reception without claiming the whole night.
 */
const TIMED_DURATION_MS = 5 * 60 * 60 * 1000;

export type CalendarEntry = {
  /** Stable per Event, so re-adding updates the entry rather than duplicating it. */
  uid: string;
  title: string;
  location: string | null;
  description: string | null;
} & (
  | { allDay: false; start: string; end: string }
  /** YYYY-MM-DD; `end` is exclusive, as both .ics and Google expect. */
  | { allDay: true; start: string; end: string }
);

/**
 * Null only when the Event has no date - there is nothing to put in a
 * calendar. With no reception time the entry is all-day rather than a guessed
 * hour.
 *
 * `eventDate` is a calendar date stored at 00:00 UTC (see DateFormatOptions),
 * so its day is read in UTC; the reception time is an Israel wall clock.
 */
export function buildCalendarEntry(params: {
  shortCode: string;
  title: string;
  eventDate: string | null;
  receptionTime: string | null;
  venueName: string | null;
  navUrl: string | null;
}): CalendarEntry | null {
  if (!params.eventDate) return null;
  const date = new Date(params.eventDate);
  if (Number.isNaN(date.getTime())) return null;

  const day = date.toISOString().slice(0, 10);
  const common = {
    uid: `${params.shortCode}@kulu-lu.com`,
    title: params.title,
    location: params.venueName?.trim() || null,
    description: params.navUrl ? `ניווט לאירוע: ${params.navUrl}` : null,
  };

  const start = params.receptionTime
    ? israelWallClockToIso(day, params.receptionTime.trim())
    : null;
  if (start) {
    const end = new Date(new Date(start).getTime() + TIMED_DURATION_MS).toISOString();
    return { ...common, allDay: false, start, end };
  }

  const next = new Date(`${day}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return { ...common, allDay: true, start: day, end: next.toISOString().slice(0, 10) };
}

/** 20261015T163000Z for an instant, 20261015 for an all-day date. */
function basicFormat(value: string, allDay: boolean): string {
  if (allDay) return value.replaceAll('-', '');
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** RFC 5545 TEXT escaping. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * RFC 5545 folds lines longer than 75 octets. Octets, not characters: a Hebrew
 * letter is two bytes in UTF-8, so a character count would overrun. A fold never
 * splits a character.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // The first line takes 75 octets; each continuation spends one on its
    // leading space.
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function toIcs(entry: CalendarEntry, now: Date = new Date()): string {
  const dateLine = (name: string, value: string) =>
    entry.allDay
      ? `${name};VALUE=DATE:${basicFormat(value, true)}`
      : `${name}:${basicFormat(value, false)}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kululu//Save the Date//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${entry.uid}`,
    `DTSTAMP:${basicFormat(now.toISOString(), false)}`,
    dateLine('DTSTART', entry.start),
    dateLine('DTEND', entry.end),
    `SUMMARY:${escapeText(entry.title)}`,
    ...(entry.location ? [`LOCATION:${escapeText(entry.location)}`] : []),
    ...(entry.description ? [`DESCRIPTION:${escapeText(entry.description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function toGoogleCalendarUrl(entry: CalendarEntry): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: entry.title,
    dates: `${basicFormat(entry.start, entry.allDay)}/${basicFormat(entry.end, entry.allDay)}`,
  });
  if (entry.location) params.set('location', entry.location);
  if (entry.description) params.set('details', entry.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
