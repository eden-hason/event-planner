import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { comparePlanOrder, numberPlan, offsetDays, offsetPhrase, sendWindowHours, timelineStatus, withDayMarker } from './timeline.ts';

// The Event date is a calendar date pinned at 00:00 UTC; a Due Time is an
// instant authored as an Israel wall clock. The offset between them is a count
// of calendar days in Israel, not a duration.
const EVENT = '2026-09-25T00:00:00Z';
/** An Israel wall clock, as a Due Time. September is IDT (+03:00). */
const due = (wallClock: string) => `${wallClock}+03:00`;
/** Any Due Time, for the status tests that only need the Schedule to be dated. */
const DUE = due('2026-09-11T09:00');

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
  assert.equal(timelineStatus({ status: 'disabled', dispatchedAt: null, scheduledDate: DUE }), 'locked');
});

test('an outstanding schedule is pending', () => {
  assert.equal(timelineStatus({ status: null, dispatchedAt: null, scheduledDate: DUE }), 'pending');
});

test('an outstanding schedule with no Due Time is undated, not scheduled', () => {
  assert.equal(
    timelineStatus({ status: null, dispatchedAt: null, scheduledDate: null }),
    'undated',
  );
});

test('a locked schedule reads as locked whether or not it has a date', () => {
  assert.equal(
    timelineStatus({ status: 'disabled', dispatchedAt: null, scheduledDate: null }),
    'locked',
  );
});

test('an undated schedule has no offset from the Event', () => {
  assert.equal(offsetDays(EVENT, null), null);
});

test('a dispatched schedule reads as sent while its deliveries land', () => {
  // The messages have left; there is nothing the organiser can still change,
  // and the results tab is the honest place to watch it finish.
  assert.equal(
    timelineStatus({ status: null, dispatchedAt: '2026-09-11T06:00:00Z', scheduledDate: DUE }),
    'sent',
  );
});

test('sent, cancelled and expired pass through', () => {
  assert.equal(timelineStatus({ status: 'sent', dispatchedAt: null, scheduledDate: DUE }), 'sent');
  assert.equal(timelineStatus({ status: 'cancelled', dispatchedAt: null, scheduledDate: DUE }), 'cancelled');
  assert.equal(timelineStatus({ status: 'expired', dispatchedAt: null, scheduledDate: DUE }), 'expired');
});

test('cancelled beats dispatched', () => {
  // A cancelled plan that was somehow claimed is still a plan nobody wanted;
  // reporting it as sent would be the one reading the organiser cannot correct.
  assert.equal(
    timelineStatus({ status: 'cancelled', dispatchedAt: '2026-09-11T06:00:00Z', scheduledDate: DUE }),
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
    timelineStatus({ status: null, dispatchedAt: null, scheduledDate: DUE }, 'in_progress'),
    'in_progress',
  );
  assert.equal(
    timelineStatus({ status: null, dispatchedAt: null, scheduledDate: DUE }, 'completed'),
    'completed',
  );
});

test('a started call plan reports its round, not its own start', () => {
  // `status = 'sent'` on a call plan is the Operator hitting Start (ADR 0004).
  // The round stays open for days after that, and is the honest reading.
  assert.equal(
    timelineStatus({ status: 'sent', dispatchedAt: null, scheduledDate: DUE }, 'in_progress'),
    'in_progress',
  );
  assert.equal(
    timelineStatus({ status: 'sent', dispatchedAt: null, scheduledDate: DUE }, 'completed'),
    'completed',
  );
});

test('a started call plan with no round left falls back to sent', () => {
  // deleteCallRound exists to undo a misclicked Start, which can leave a
  // 'sent' plan with nothing behind it.
  assert.equal(timelineStatus({ status: 'sent', dispatchedAt: null, scheduledDate: DUE }, null), 'sent');
});

test('a call plan with no round yet is pending', () => {
  assert.equal(timelineStatus({ status: null, dispatchedAt: null, scheduledDate: DUE }, null), 'pending');
});

test('a locked or cancelled plan ignores its round', () => {
  assert.equal(timelineStatus({ status: 'disabled', dispatchedAt: null, scheduledDate: DUE }, 'completed'), 'locked');
  assert.equal(timelineStatus({ status: 'cancelled', dispatchedAt: null, scheduledDate: DUE }, 'completed'), 'cancelled');
});

// ─── comparePlanOrder ─────────────────────────────────────────────────────────

const entry = (
  id: string,
  scheduleTypeKey: string,
  scheduledDate: string | null,
  targetStatus: string | null = null,
) => ({ id, scheduleTypeKey, scheduledDate, targetStatus });

const order = (entries: ReturnType<typeof entry>[]) =>
  [...entries].sort(comparePlanOrder).map((e) => e.id);

test('dated schedules run by Due Time', () => {
  assert.deepEqual(
    order([
      entry('reminder', 'event_reminder', due('2026-09-25T10:00')),
      entry('invite', 'initial_invitation', due('2026-08-26T10:00')),
    ]),
    ['invite', 'reminder'],
  );
});

test('undated schedules come after every dated one', () => {
  assert.deepEqual(
    order([
      entry('invite', 'initial_invitation', null),
      entry('thanks', 'post_event', due('2026-09-26T10:00')),
    ]),
    ['thanks', 'invite'],
  );
});

test('undated schedules follow the lifecycle, then ask everyone before chasing', () => {
  assert.deepEqual(
    order([
      entry('a-chase', 'confirmation', null, 'pending'),
      entry('z-ask', 'confirmation', null),
      entry('invite', 'initial_invitation', null),
    ]),
    ['invite', 'z-ask', 'a-chase'],
  );
});

// ─── numberPlan ───────────────────────────────────────────────────────────────

test('numbers a repeated type in plan order, so a dated round is the first', () => {
  const numbers = numberPlan([
    entry('chase', 'confirmation', null, 'pending'),
    entry('ask', 'confirmation', due('2026-09-01T10:00')),
    entry('invite', 'initial_invitation', null),
  ]);
  assert.deepEqual(numbers.get('ask'), { index: 1, total: 2 });
  assert.deepEqual(numbers.get('chase'), { index: 2, total: 2 });
  assert.deepEqual(numbers.get('invite'), { index: 1, total: 1 });
});
