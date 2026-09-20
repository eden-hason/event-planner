import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { offsetDays, offsetPhrase, sendWindowHours, timelineStatus, withDayMarker } from './timeline.ts';

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

// ─── sendWindowHours ──────────────────────────────────────────────────────────

test('the hours offered stop before the window closes', () => {
  // 21:00 is already closed, so 20:00 is the last authorable hour.
  assert.deepEqual(sendWindowHours({ start: '09:00', end: '12:00' }), [
    '09:00',
    '10:00',
    '11:00',
  ]);
});

test('the hours follow a window the operator has narrowed', () => {
  assert.deepEqual(sendWindowHours({ start: '10:00', end: '12:00' }), [
    '10:00',
    '11:00',
  ]);
});

test('a window with no room offers nothing rather than a broken range', () => {
  assert.deepEqual(sendWindowHours({ start: '10:00', end: '10:00' }), []);
  assert.deepEqual(sendWindowHours({ start: '14:00', end: '09:00' }), []);
});

// ─── offsetPhrase ─────────────────────────────────────────────────────────────

test('offsetPhrase names the direction and keeps the count positive', () => {
  assert.deepEqual(offsetPhrase(-30), { key: 'before', count: 30 });
  assert.deepEqual(offsetPhrase(0), { key: 'dayOf', count: 0 });
  assert.deepEqual(offsetPhrase(2), { key: 'after', count: 2 });
  assert.equal(offsetPhrase(null), null);
});

// ─── timelineStatus, for a call plan ─────────────────────────────────────────

test('a call plan reports its round rather than its own claim', () => {
  assert.equal(
    timelineStatus({ status: null, dispatchedAt: null }, 'in_progress'),
    'in_progress',
  );
  assert.equal(
    timelineStatus({ status: null, dispatchedAt: null }, 'completed'),
    'completed',
  );
});

test('a started call plan reports its round, not its own start', () => {
  // `status = 'sent'` on a call plan is the Operator hitting Start (ADR 0004).
  // The round stays open for days after that, and is the honest reading.
  assert.equal(
    timelineStatus({ status: 'sent', dispatchedAt: null }, 'in_progress'),
    'in_progress',
  );
  assert.equal(
    timelineStatus({ status: 'sent', dispatchedAt: null }, 'completed'),
    'completed',
  );
});

test('a started call plan with no round left falls back to sent', () => {
  // deleteCallRound exists to undo a misclicked Start, which can leave a
  // 'sent' plan with nothing behind it.
  assert.equal(timelineStatus({ status: 'sent', dispatchedAt: null }, null), 'sent');
});

test('a call plan with no round yet is pending', () => {
  assert.equal(timelineStatus({ status: null, dispatchedAt: null }, null), 'pending');
});

test('a locked or cancelled plan ignores its round', () => {
  assert.equal(timelineStatus({ status: 'disabled', dispatchedAt: null }, 'completed'), 'locked');
  assert.equal(timelineStatus({ status: 'cancelled', dispatchedAt: null }, 'completed'), 'cancelled');
});
