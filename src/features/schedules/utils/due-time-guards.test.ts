import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dueTimeIssue,
  firstSendableDay,
  isDueAfterLastDay,
  lastDueDay,
  pastDueTime,
  pinnedDueDay,
  // @ts-expect-error Node's type-stripping test runner requires the source extension
} from './due-time-guards.ts';

// The Event date is a calendar date pinned at 00:00 UTC; a Due Time is an
// instant authored as an Israel wall clock. September is IDT (+03:00).
const EVENT = '2026-09-26T00:00:00Z';
const israel = (wallClock: string) => new Date(`${wallClock}+03:00`);
const due = (wallClock: string) => `${wallClock}+03:00`;
const RULES = { sendWindow: { start: '09:00', end: '21:00' }, maxLatenessHours: 48 };

// ─── lastDueDay / isDueAfterLastDay ─────────────────────────────────────────────

test('lastDueDay is the Event day, and none for the Thank You or an undated Event', () => {
  assert.equal(lastDueDay(EVENT, 'initial_invitation'), '2026-09-26');
  assert.equal(lastDueDay(EVENT, 'post_event'), null);
  assert.equal(lastDueDay(null, 'initial_invitation'), null);
});

test('the Advance Reminder must go out before the Event day', () => {
  // Its last day is the day before, also across a month boundary.
  assert.equal(lastDueDay(EVENT, 'advance_reminder'), '2026-09-25');
  assert.equal(lastDueDay('2026-10-01T00:00:00Z', 'advance_reminder'), '2026-09-30');
  assert.equal(pinnedDueDay(EVENT, 'advance_reminder'), null);

  const params = { eventDate: EVENT, scheduleTypeKey: 'advance_reminder' };
  // Any earlier day is fine, the Event day is refused, even before the window opens.
  assert.equal(isDueAfterLastDay({ ...params, scheduledDate: due('2026-09-24T10:00') }), false);
  assert.equal(isDueAfterLastDay({ ...params, scheduledDate: due('2026-09-25T20:30') }), false);
  assert.equal(isDueAfterLastDay({ ...params, scheduledDate: due('2026-09-26T08:00') }), true);

  const now = israel('2026-09-20T12:00');
  assert.equal(
    dueTimeIssue({ ...params, scheduledDate: due('2026-09-26T10:00'), now, rules: RULES }),
    'notBeforeEvent',
  );
  assert.equal(
    dueTimeIssue({ ...params, scheduledDate: due('2026-09-25T10:00'), now, rules: RULES }),
    null,
  );
  // The Event Reminder is still told it may not go after the Event, not before.
  assert.equal(
    dueTimeIssue({
      eventDate: EVENT,
      scheduleTypeKey: 'event_reminder',
      scheduledDate: due('2026-09-27T10:00'),
      now,
      rules: RULES,
    }),
    'afterEvent',
  );
});

test('pinnedDueDay pins only the Event Reminder, to the Event day', () => {
  assert.equal(pinnedDueDay(EVENT, 'event_reminder'), '2026-09-26');
  assert.equal(pinnedDueDay(EVENT, 'initial_invitation'), null);
  assert.equal(pinnedDueDay(EVENT, 'post_event'), null);
  assert.equal(pinnedDueDay(null, 'event_reminder'), null);
});

test('isDueAfterLastDay allows the Event day itself, at any hour', () => {
  const params = { eventDate: EVENT, scheduleTypeKey: 'event_reminder' };
  assert.equal(isDueAfterLastDay({ ...params, scheduledDate: due('2026-09-26T20:00') }), false);
  assert.equal(isDueAfterLastDay({ ...params, scheduledDate: due('2026-09-27T09:00') }), true);
});

test('isDueAfterLastDay reads the day in Israel, not UTC', () => {
  // 00:30 Israel on the 27th is still the 26th in UTC.
  assert.equal(
    isDueAfterLastDay({
      eventDate: EVENT,
      scheduleTypeKey: 'event_reminder',
      scheduledDate: due('2026-09-27T00:30'),
    }),
    true,
  );
});

test('isDueAfterLastDay never applies to the Thank You', () => {
  assert.equal(
    isDueAfterLastDay({
      eventDate: EVENT,
      scheduleTypeKey: 'post_event',
      scheduledDate: due('2026-09-27T10:00'),
    }),
    false,
  );
});

// ─── pastDueTime ──────────────────────────────────────────────────────────────

test('pastDueTime is null for a Due Time still ahead', () => {
  assert.equal(pastDueTime(due('2026-09-20T10:00'), israel('2026-09-20T09:30'), RULES), null);
});

test('pastDueTime sends now while the Send Window is open', () => {
  // The case from the backlog: 10:00 picked at 16:14.
  assert.deepEqual(
    pastDueTime(due('2026-09-20T10:00'), israel('2026-09-20T16:14'), RULES),
    { kind: 'sendsNow' },
  );
});

test('pastDueTime holds until the window opens when it is closed', () => {
  const result = pastDueTime(due('2026-09-20T20:00'), israel('2026-09-20T22:30'), RULES);
  assert.deepEqual(result, {
    kind: 'heldUntil',
    opensAt: israel('2026-09-21T09:00').toISOString(),
  });
});

test('pastDueTime expires past the lateness limit, measured when it would send', () => {
  assert.deepEqual(
    pastDueTime(due('2026-09-17T10:00'), israel('2026-09-20T10:00'), RULES),
    { kind: 'expires' },
  );
  // 44 hours late now, but the window is shut until 09:00 - 54 hours by then.
  assert.deepEqual(
    pastDueTime(due('2026-09-19T03:00'), israel('2026-09-20T23:00'), RULES),
    { kind: 'expires' },
  );
});

// ─── firstSendableDay ─────────────────────────────────────────────────────────

test('firstSendableDay is the Israel day the lateness limit reaches back to', () => {
  assert.equal(firstSendableDay(israel('2026-09-20T10:00'), 48), '2026-09-18');
  // 00:30 Israel is 22:30 UTC the day before; the answer is still Israel's day.
  assert.equal(firstSendableDay(israel('2026-09-20T00:30'), 48), '2026-09-18');
});

// ─── dueTimeIssue ─────────────────────────────────────────────────────────────

test('dueTimeIssue blocks after the Event and past the lateness limit, nothing else', () => {
  const base = {
    eventDate: EVENT,
    scheduleTypeKey: 'initial_invitation',
    now: israel('2026-09-20T16:00'),
    rules: RULES,
  };
  assert.equal(dueTimeIssue({ ...base, scheduledDate: due('2026-09-27T10:00') }), 'afterEvent');
  assert.equal(dueTimeIssue({ ...base, scheduledDate: due('2026-09-10T10:00') }), 'expires');
  assert.equal(dueTimeIssue({ ...base, scheduledDate: due('2026-09-20T10:00') }), null);
  assert.equal(dueTimeIssue({ ...base, scheduledDate: due('2026-09-22T10:00') }), null);
});
