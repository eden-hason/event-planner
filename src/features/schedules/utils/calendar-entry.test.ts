import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCalendarEntry,
  toGoogleCalendarUrl,
  toIcs,
  type CalendarEntry,
} from './calendar-entry';

const base = {
  shortCode: 'ABC123',
  title: 'חתונה של נועה ודורון',
  eventDate: '2026-10-15T00:00:00+00:00',
  receptionTime: '19:30',
  venueName: 'גני התערוכה',
  navUrl: 'https://kulu-lu.com/nav/ABC123',
};

describe('buildCalendarEntry', () => {
  it('starts at the reception time in Israel and lasts five hours', () => {
    const entry = buildCalendarEntry(base);
    assert.ok(entry && !entry.allDay);
    // October 15 is still summer time in Israel (UTC+3).
    assert.equal(entry.start, '2026-10-15T16:30:00.000Z');
    assert.equal(entry.end, '2026-10-15T21:30:00.000Z');
    assert.equal(entry.uid, 'ABC123@kulu-lu.com');
    assert.equal(entry.description, 'ניווט לאירוע: https://kulu-lu.com/nav/ABC123');
  });

  it('follows winter time', () => {
    const entry = buildCalendarEntry({ ...base, eventDate: '2026-12-03T00:00:00+00:00' });
    assert.equal(entry?.start, '2026-12-03T17:30:00.000Z');
  });

  it('is all-day when there is no reception time, or it is malformed', () => {
    for (const receptionTime of [null, '', '7pm']) {
      const entry = buildCalendarEntry({ ...base, receptionTime });
      assert.ok(entry?.allDay);
      assert.equal(entry.start, '2026-10-15');
      assert.equal(entry.end, '2026-10-16');
    }
  });

  it('reads the day in UTC, the way event_date is stored', () => {
    const entry = buildCalendarEntry({ ...base, eventDate: '2026-10-31T00:00:00Z', receptionTime: null });
    assert.equal(entry?.start, '2026-10-31');
    assert.equal(entry?.end, '2026-11-01');
  });

  it('is null with no date', () => {
    assert.equal(buildCalendarEntry({ ...base, eventDate: null }), null);
    assert.equal(buildCalendarEntry({ ...base, eventDate: 'not a date' }), null);
  });

  it('leaves out an empty venue and a missing nav link', () => {
    const entry = buildCalendarEntry({ ...base, venueName: '  ', navUrl: null });
    assert.equal(entry?.location, null);
    assert.equal(entry?.description, null);
  });
});

describe('toIcs', () => {
  const now = new Date('2026-09-19T08:00:00Z');

  it('writes a timed event in UTC', () => {
    const ics = toIcs(buildCalendarEntry(base)!, now);
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /\r\nDTSTART:20261015T163000Z\r\n/);
    assert.match(ics, /\r\nDTEND:20261015T213000Z\r\n/);
    assert.match(ics, /\r\nDTSTAMP:20260919T080000Z\r\n/);
    assert.match(ics, /\r\nSUMMARY:חתונה של נועה ודורון\r\n/);
    assert.match(ics, /END:VCALENDAR\r\n$/);
  });

  it('writes an all-day event as dates', () => {
    const ics = toIcs(buildCalendarEntry({ ...base, receptionTime: null })!, now);
    assert.match(ics, /\r\nDTSTART;VALUE=DATE:20261015\r\n/);
    assert.match(ics, /\r\nDTEND;VALUE=DATE:20261016\r\n/);
  });

  it('escapes commas, semicolons and line breaks', () => {
    const entry: CalendarEntry = {
      ...buildCalendarEntry(base)!,
      location: 'אולם; קומה 2, תל אביב',
      description: 'שורה\nשנייה',
    };
    const ics = toIcs(entry, now);
    assert.match(ics, /LOCATION:אולם\\; קומה 2\\, תל אביב/);
    assert.match(ics, /DESCRIPTION:שורה\\nשנייה/);
  });

  it('folds long Hebrew lines at 75 octets without splitting a letter', () => {
    const entry: CalendarEntry = { ...buildCalendarEntry(base)!, title: 'א'.repeat(100) };
    const encoder = new TextEncoder();
    for (const line of toIcs(entry, now).split('\r\n')) {
      assert.ok(encoder.encode(line).length <= 75, `too long: ${line}`);
    }
    // Unfolding restores the title exactly.
    assert.match(toIcs(entry, now).replace(/\r\n /g, ''), new RegExp(`SUMMARY:${'א'.repeat(100)}\r\n`));
  });
});

describe('toGoogleCalendarUrl', () => {
  it('carries the title, UTC dates and venue', () => {
    const url = new URL(toGoogleCalendarUrl(buildCalendarEntry(base)!));
    assert.equal(url.origin + url.pathname, 'https://calendar.google.com/calendar/render');
    assert.equal(url.searchParams.get('action'), 'TEMPLATE');
    assert.equal(url.searchParams.get('text'), 'חתונה של נועה ודורון');
    assert.equal(url.searchParams.get('dates'), '20261015T163000Z/20261015T213000Z');
    assert.equal(url.searchParams.get('location'), 'גני התערוכה');
  });

  it('uses date-only range for all-day', () => {
    const url = new URL(toGoogleCalendarUrl(buildCalendarEntry({ ...base, receptionTime: null })!));
    assert.equal(url.searchParams.get('dates'), '20261015/20261016');
  });
});
