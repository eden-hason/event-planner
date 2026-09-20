import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { offsetDays, timelineStatus, withDayMarker } from './timeline.ts';

// The Event date is a calendar date pinned at 00:00 UTC; a Due Time is an
// instant authored as an Israel wall clock. The offset between them is a count
// of calendar days in Israel, not a duration.
const EVENT = '2026-09-25T00:00:00Z';
/** An Israel wall clock, as a Due Time. September is IDT (+03:00). */
const due = (wallClock: string) => `${wallClock}+03:00`;

// ─── offsetDays ───────────────────────────────────────────────────────────────

test('offsetDays counts whole days before the event', () => {
  assert.equal(offsetDays(EVENT, due('2026-08-26T10:00')), -30);
  assert.equal(offsetDays(EVENT, due('2026-09-11T09:00')), -14);
  assert.equal(offsetDays(EVENT, due('2026-09-22T11:00')), -3);
});

test('offsetDays is 0 on the day of the event, whatever the clock face', () => {
  assert.equal(offsetDays(EVENT, due('2026-09-25T09:00')), 0);
  assert.equal(offsetDays(EVENT, due('2026-09-25T20:59')), 0);
});

test('offsetDays counts days after the event as positive', () => {
  assert.equal(offsetDays(EVENT, due('2026-09-26T12:00')), 1);
  assert.equal(offsetDays(EVENT, due('2026-09-27T12:00')), 2);
});

test('offsetDays reads the clock face in Israel, not UTC', () => {
  // 00:30 Israel on the 26th is still 21:30 UTC on the 25th. Counting in UTC
  // would call this the day of the event; in Israel it is the day after.
  assert.equal(offsetDays(EVENT, due('2026-09-26T00:30')), 1);
});

test('offsetDays returns null without an event date', () => {
  assert.equal(offsetDays(null, due('2026-09-11T09:00')), null);
});

// ─── timelineStatus ───────────────────────────────────────────────────────────

test('a seeded but never enabled schedule reads as locked', () => {
  assert.equal(timelineStatus({ status: 'disabled', dispatchedAt: null }), 'locked');
});

test('an outstanding schedule is pending', () => {
  assert.equal(timelineStatus({ status: null, dispatchedAt: null }), 'pending');
});

test('a dispatched schedule reads as sent while its deliveries land', () => {
  // The messages have left; there is nothing the organiser can still change,
  // and the results tab is the honest place to watch it finish.
  assert.equal(
    timelineStatus({ status: null, dispatchedAt: '2026-09-11T06:00:00Z' }),
    'sent',
  );
});

test('sent, cancelled and expired pass through', () => {
  assert.equal(timelineStatus({ status: 'sent', dispatchedAt: null }), 'sent');
  assert.equal(timelineStatus({ status: 'cancelled', dispatchedAt: null }), 'cancelled');
  assert.equal(timelineStatus({ status: 'expired', dispatchedAt: null }), 'expired');
});

test('cancelled beats dispatched', () => {
  // A cancelled plan that was somehow claimed is still a plan nobody wanted;
  // reporting it as sent would be the one reading the organiser cannot correct.
  assert.equal(
    timelineStatus({ status: 'cancelled', dispatchedAt: '2026-09-11T06:00:00Z' }),
    'cancelled',
  );
});

// ─── withDayMarker ────────────────────────────────────────────────────────────

const row = (offset: number) => ({ offset });

test('the day marker lands before the first entry on or after the event', () => {
  const rows = withDayMarker([row(-30), row(-3), row(0), row(2)]);
  assert.deepEqual(
    rows.map((r) => (r.kind === 'dayMarker' ? 'MARKER' : r.item.offset)),
    [-30, -3, 'MARKER', 0, 2],
  );
});

test('a timeline entirely before the event ends with the marker', () => {
  const rows = withDayMarker([row(-30), row(-14)]);
  assert.equal(rows.at(-1)?.kind, 'dayMarker');
  assert.equal(rows.length, 3);
});

test('a timeline entirely on or after the event starts with the marker', () => {
  const rows = withDayMarker([row(0), row(1)]);
  assert.equal(rows[0].kind, 'dayMarker');
  assert.equal(rows.length, 3);
});

test('exactly one marker is inserted', () => {
  const rows = withDayMarker([row(-1), row(0), row(1), row(2)]);
  assert.equal(rows.filter((r) => r.kind === 'dayMarker').length, 1);
});

test('an empty timeline gets no marker', () => {
  assert.deepEqual(withDayMarker([]), []);
});

test('an undated timeline gets no marker', () => {
  // Without an event date every offset is null, so there is no "day of" to mark.
  const rows = withDayMarker([{ offset: null }, { offset: null }]);
  assert.equal(rows.filter((r) => r.kind === 'dayMarker').length, 0);
  assert.equal(rows.length, 2);
});
