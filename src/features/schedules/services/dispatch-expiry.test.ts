import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { expiryReason } from './dispatch-schedules.ts';

const now = new Date('2026-10-05T12:00:00Z');
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3_600_000).toISOString();
const MAX_LATENESS = 48;

const check = (params: {
  scheduledDate: string;
  scheduleTypeKey?: string;
  eventDate: string | null;
}) =>
  expiryReason({
    schedule: {
      scheduledDate: params.scheduledDate,
      scheduleTypeKey: params.scheduleTypeKey ?? 'event_reminder',
    },
    eventDate: params.eventDate,
    now,
    maxLatenessHours: MAX_LATENESS,
  });

// ─── Lateness ─────────────────────────────────────────────────────────────────

test('a schedule due moments ago is not expired', () => {
  assert.equal(check({ scheduledDate: hoursAgo(1), eventDate: '2026-11-05' }), null);
});

test('a schedule inside the lateness limit still sends', () => {
  assert.equal(check({ scheduledDate: hoursAgo(47), eventDate: '2026-11-05' }), null);
});

test('a schedule past the lateness limit expires', () => {
  const reason = check({ scheduledDate: hoursAgo(72), eventDate: '2026-11-05' });
  assert.match(reason ?? '', /72 hours ago/);
  assert.match(reason ?? '', /48 hour limit/);
});

test('the lateness limit is larger than the longest possible Shabbat hold', () => {
  // ADR 0015: the Shabbat guard can hold a Schedule about 29 hours, so a
  // 24-hour cutoff would expire the Schedules the guard itself held. These two
  // settings have to be read together.
  assert.equal(check({ scheduledDate: hoursAgo(29), eventDate: '2026-11-05' }), null);
});

// ─── The event has already happened ───────────────────────────────────────────

test('a reminder for an event that already happened expires', () => {
  // The genuinely harmful case: telling 200 people where to sit at a wedding
  // that ended last night.
  const reason = check({ scheduledDate: hoursAgo(2), eventDate: '2026-10-01' });
  assert.match(reason ?? '', /already happened/);
});

test('an event happening today has not happened yet', () => {
  // event_date is a calendar date at 00:00 UTC; the day has to end first.
  assert.equal(check({ scheduledDate: hoursAgo(2), eventDate: '2026-10-05' }), null);
});

test('a thank you after the event is exactly what it is for', () => {
  assert.equal(
    check({
      scheduledDate: hoursAgo(2),
      scheduleTypeKey: 'post_event',
      eventDate: '2026-10-01',
    }),
    null,
  );
});

test('a thank you still expires once it is simply too late', () => {
  // The Event-date exemption does not exempt it from the lateness rule.
  const reason = check({
    scheduledDate: hoursAgo(100),
    scheduleTypeKey: 'post_event',
    eventDate: '2026-10-01',
  });
  assert.match(reason ?? '', /past the 48 hour limit/);
});

test('an event with no date is judged on lateness alone', () => {
  assert.equal(check({ scheduledDate: hoursAgo(5), eventDate: null }), null);
  assert.match(check({ scheduledDate: hoursAgo(80), eventDate: null }) ?? '', /48 hour limit/);
});

test('a schedule not yet due is never expired', () => {
  const future = new Date(now.getTime() + 3_600_000).toISOString();
  assert.equal(check({ scheduledDate: future, eventDate: '2026-11-05' }), null);
});
