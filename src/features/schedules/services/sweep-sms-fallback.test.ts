import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { freezeDecision, settleDecision } from './sweep-sms-fallback.ts';

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
