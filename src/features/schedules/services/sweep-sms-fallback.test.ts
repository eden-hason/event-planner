import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { failedCandidateScheduleIds, freezeDecision, lastFailureActivityAt, scheduleFreeze, settleDecision } from './sweep-sms-fallback.ts';

const THRESHOLDS = { freezePct: 30, freezeMin: 10 };

// ─── The Fallback Freeze ──────────────────────────────────────────────────────

test('an ordinary failure rate falls back automatically', () => {
  // 11% is the worst rate yet observed on a real Schedule. The threshold sits
  // about three times above it on purpose.
  const decision = freezeDecision({
    totalAttempts: 274,
    guestLevelFailures: 30,
    ...THRESHOLDS,
  });
  assert.equal(decision.frozen, false);
  assert.equal(decision.reason, null);
});

test('a spike above the threshold freezes', () => {
  const decision = freezeDecision({
    totalAttempts: 100,
    guestLevelFailures: 40,
    ...THRESHOLDS,
  });
  assert.equal(decision.frozen, true);
  assert.match(decision.reason ?? '', /40 of 100/);
  assert.match(decision.reason ?? '', /check the WhatsApp account/i);
});

test('the threshold is exclusive - exactly 30% still sends', () => {
  const decision = freezeDecision({
    totalAttempts: 100,
    guestLevelFailures: 30,
    ...THRESHOLDS,
  });
  assert.equal(decision.frozen, false);
});

test('the floor stops a small event freezing over a couple of failures', () => {
  // A five-guest test Event with two failures is 40%, well over the rate, and
  // must not freeze: the floor is what makes the percentage meaningful.
  const decision = freezeDecision({
    totalAttempts: 5,
    guestLevelFailures: 2,
    ...THRESHOLDS,
  });
  assert.equal(decision.frozen, false);
});

test('the floor is inclusive - ten failures at a high rate freezes', () => {
  assert.equal(
    freezeDecision({ totalAttempts: 20, guestLevelFailures: 10, ...THRESHOLDS }).frozen,
    true,
  );
  assert.equal(
    freezeDecision({ totalAttempts: 20, guestLevelFailures: 9, ...THRESHOLDS }).frozen,
    false,
  );
});

test('a whole audience failing at guest level freezes', () => {
  // 131049 and 130472 across 274 guests is WhatsApp deciding something about
  // Kululu's account, not about 274 individual people.
  const decision = freezeDecision({
    totalAttempts: 274,
    guestLevelFailures: 274,
    ...THRESHOLDS,
  });
  assert.equal(decision.frozen, true);
});

test('a spike of 131000 freezes like any other guest-level code', () => {
  // 131000 is Meta's generic error, made guest-level so a lone one falls back.
  // Its cause is unknown, so a whole audience of them must still hold the batch.
  const attempts = [
    ...Array.from({ length: 12 }, () => ({ channel: 'whatsapp', status: 'failed', error_code: 131000 })),
    ...Array.from({ length: 8 }, () => ({ channel: 'whatsapp', status: 'read', error_code: null })),
  ];
  assert.equal(scheduleFreeze(attempts).frozen, true);
});

test('the freeze counts WhatsApp attempts only', () => {
  // The fallback SMS sent so far must not dilute the rate.
  const attempts = [
    ...Array.from({ length: 12 }, () => ({ channel: 'whatsapp', status: 'failed', error_code: 131026 })),
    ...Array.from({ length: 8 }, () => ({ channel: 'whatsapp', status: 'read', error_code: null })),
    ...Array.from({ length: 30 }, () => ({ channel: 'sms', status: 'sent', error_code: null })),
  ];
  assert.equal(scheduleFreeze(attempts).frozen, true);
});

test('no attempts cannot freeze', () => {
  assert.equal(
    freezeDecision({ totalAttempts: 0, guestLevelFailures: 0, ...THRESHOLDS }).frozen,
    false,
  );
});

// ─── Settling ─────────────────────────────────────────────────────────────────

const now = new Date('2026-10-05T12:00:00Z');
const minutesAgo = (n: number) => new Date(now.getTime() - n * 60_000).toISOString();

test('a schedule with deliveries still queued is not settled', () => {
  const decision = settleDecision({
    queuedDeliveries: 3,
    pendingAttempts: 0,
    lastActivityAt: minutesAgo(60),
    settleMinutes: 10,
    now,
  });
  assert.equal(decision.settled, false);
  assert.match(decision.reason ?? '', /still queued/);
});

test('a schedule with attempts in flight is not settled', () => {
  const decision = settleDecision({
    queuedDeliveries: 0,
    pendingAttempts: 2,
    lastActivityAt: minutesAgo(60),
    settleMinutes: 10,
    now,
  });
  assert.equal(decision.settled, false);
  assert.match(decision.reason ?? '', /in flight/);
});

test('recent activity holds the schedule inside the settle window', () => {
  const decision = settleDecision({
    queuedDeliveries: 0,
    pendingAttempts: 0,
    lastActivityAt: minutesAgo(3),
    settleMinutes: 10,
    now,
  });
  assert.equal(decision.settled, false);
  assert.match(decision.reason ?? '', /3 minute/);
});

test('quiet, drained and nothing in flight is settled', () => {
  const decision = settleDecision({
    queuedDeliveries: 0,
    pendingAttempts: 0,
    lastActivityAt: minutesAgo(11),
    settleMinutes: 10,
    now,
  });
  assert.equal(decision.settled, true);
  assert.equal(decision.reason, null);
});

test('a schedule midway through the retry ladder is never settled by the clock alone', () => {
  // The queue conditions are what make the window self-adjusting: an hour of
  // quiet does not matter while a retry is still outstanding.
  const decision = settleDecision({
    queuedDeliveries: 1,
    pendingAttempts: 0,
    lastActivityAt: minutesAgo(600),
    settleMinutes: 10,
    now,
  });
  assert.equal(decision.settled, false);
});

test('a schedule with no attempts at all is not settled', () => {
  const decision = settleDecision({
    queuedDeliveries: 0,
    pendingAttempts: 0,
    lastActivityAt: null,
    settleMinutes: 10,
    now,
  });
  assert.equal(decision.settled, false);
});

// ─── What counts as activity ──────────────────────────────────────────────────

test('read receipts do not restart the settle window', () => {
  // A real Schedule: failures landed at dispatch, then guests kept opening the
  // message every few minutes. Counting those reads meant it never settled.
  const attempts = [
    { status: 'failed', created_at: minutesAgo(25), updated_at: minutesAgo(24) },
    { status: 'read', created_at: minutesAgo(25), updated_at: minutesAgo(1) },
    { status: 'delivered', created_at: minutesAgo(25), updated_at: minutesAgo(2) },
  ];
  assert.equal(lastFailureActivityAt(attempts), minutesAgo(24));
});

test('a late failure does restart it', () => {
  const attempts = [
    { status: 'failed', created_at: minutesAgo(25), updated_at: minutesAgo(3) },
    { status: 'read', created_at: minutesAgo(25), updated_at: minutesAgo(1) },
  ];
  assert.equal(lastFailureActivityAt(attempts), minutesAgo(3));
});

test('a new attempt counts from when it was made', () => {
  const attempts = [
    { status: 'failed', created_at: minutesAgo(30), updated_at: minutesAgo(29) },
    { status: 'sent', created_at: minutesAgo(4), updated_at: minutesAgo(4) },
  ];
  assert.equal(lastFailureActivityAt(attempts), minutesAgo(4));
});

test('no attempts means no activity', () => {
  assert.equal(lastFailureActivityAt([]), null);
});

// ─── Which failed Schedules take a slot ───────────────────────────────────────

const WINDOW = { now, minHours: 2, maxHours: 72 };
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3_600_000).toISOString();

function failed(
  scheduleId: string,
  attempts: { channel: 'whatsapp' | 'sms'; status: string; error_code?: number | null }[],
  overrides: { updatedAt?: string; phone?: string | null } = {},
) {
  return {
    id: `${scheduleId}-delivery`,
    schedule_id: scheduleId,
    status: 'failed' as const,
    guest_id: 'guest-1',
    confirmation_token: 'token',
    updated_at: overrides.updatedAt ?? hoursAgo(1),
    guests: {
      name: 'Dana',
      phone_number: overrides.phone === undefined ? '0521234567' : overrides.phone,
    },
    message_delivery_attempts: attempts.map((a) => ({
      error_code: null,
      error_message: null,
      sent_at: null,
      created_at: hoursAgo(1),
      ...a,
    })),
  };
}

const guestLevel = { channel: 'whatsapp' as const, status: 'failed', error_code: 131049 };

test('a fresh guest-level WhatsApp failure takes a slot', () => {
  assert.deepEqual(failedCandidateScheduleIds([failed('fresh', [guestLevel])], WINDOW), ['fresh']);
});

test('a schedule sent by SMS never takes a slot', () => {
  // The five Schedules that held every slot on 2026-10-15: their anchor
  // template was SMS, so each failure is an SMS attempt and nothing can follow.
  const rows = [failed('sms-anchored', [{ channel: 'sms', status: 'failed' }])];
  assert.deepEqual(failedCandidateScheduleIds(rows, WINDOW), []);
});

test('a failure an SMS was already tried for never takes a slot', () => {
  // The sweeper never retries a failed SMS - that waits on an Operator.
  const rows = [failed('handled', [guestLevel, { channel: 'sms', status: 'failed' }])];
  assert.deepEqual(failedCandidateScheduleIds(rows, WINDOW), []);
});

test('a system-level failure never takes a slot', () => {
  const rows = [failed('system', [{ channel: 'whatsapp', status: 'failed', error_code: 132000 }])];
  assert.deepEqual(failedCandidateScheduleIds(rows, WINDOW), []);
});

test('a guest with no phone keeps the slot - an Owner can still fix the number', () => {
  // Also what lets these tests see eligible guests at all: under the tsx test
  // runner every phone reads as invalid (see send-sms-fallback.test.ts).
  assert.deepEqual(
    failedCandidateScheduleIds([failed('no-phone', [guestLevel], { phone: null })], WINDOW),
    ['no-phone'],
  );
});

test('one eligible delivery is enough for the schedule', () => {
  const rows = [
    failed('mixed', [guestLevel, { channel: 'sms', status: 'failed' }]),
    failed('mixed', [guestLevel]),
  ];
  assert.deepEqual(failedCandidateScheduleIds(rows, WINDOW), ['mixed']);
});

test('failures older than the window are left alone', () => {
  const rows = [failed('old', [guestLevel], { updatedAt: hoursAgo(73) })];
  assert.deepEqual(failedCandidateScheduleIds(rows, WINDOW), []);
});

test('the newest failure comes first, each schedule once', () => {
  const rows = [
    failed('older', [guestLevel], { updatedAt: hoursAgo(30) }),
    failed('newest', [guestLevel], { updatedAt: hoursAgo(1) }),
    failed('older', [guestLevel], { updatedAt: hoursAgo(20) }),
    failed('middle', [guestLevel], { updatedAt: hoursAgo(10) }),
  ];
  assert.deepEqual(failedCandidateScheduleIds(rows, WINDOW), ['newest', 'middle', 'older']);
});
