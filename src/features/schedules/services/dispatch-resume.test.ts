import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { shouldResume, type DispatchLogRow } from './dispatch-schedules.ts';

const now = new Date('2026-10-08T16:00:00Z');
const minutesAgo = (n: number) => new Date(now.getTime() - n * 60_000).toISOString();
const MAX_LATENESS = 48;

const check = (dispatchedAt: string, log: DispatchLogRow[] = []) =>
  shouldResume({ dispatchedAt, log, now, maxLatenessHours: MAX_LATENESS });

// ─── The interrupted dispatch ─────────────────────────────────────────────────

test('a claim with no dispatch log at all is resumed', () => {
  // 2026-10-08: killed at maxDuration after queueing 311 of 513, nothing logged.
  assert.equal(check(minutesAgo(60)), true);
});

test('a claim that finished is not resumed', () => {
  assert.equal(
    check(minutesAgo(60), [{ outcome: 'dispatched', attemptedAt: minutesAgo(59) }]),
    false,
  );
});

test('held rows do not count as finished', () => {
  assert.equal(
    check(minutesAgo(60), [
      { outcome: 'held', attemptedAt: minutesAgo(30) },
      { outcome: 'held', attemptedAt: minutesAgo(29) },
    ]),
    true,
  );
});

test('a resume that found the event over is final', () => {
  assert.equal(
    check(minutesAgo(60), [{ outcome: 'expired', attemptedAt: minutesAgo(30) }]),
    false,
  );
});

// ─── Timing ───────────────────────────────────────────────────────────────────

test('a claim young enough to still be running is left alone', () => {
  assert.equal(check(minutesAgo(5)), false);
});

test('a claim older than the lateness window is left to an Operator', () => {
  assert.equal(check(minutesAgo(MAX_LATENESS * 60 + 1)), false);
});

test('an unreadable claim time is never resumed', () => {
  assert.equal(check('not a date'), false);
});

// ─── Giving up ────────────────────────────────────────────────────────────────

test('a couple of failed tries are retried', () => {
  assert.equal(
    check(minutesAgo(60), [
      { outcome: 'failed', attemptedAt: minutesAgo(59) },
      { outcome: 'failed', attemptedAt: minutesAgo(40) },
    ]),
    true,
  );
});

test('a failure moments ago waits before the next try', () => {
  assert.equal(
    check(minutesAgo(60), [{ outcome: 'failed', attemptedAt: minutesAgo(3) }]),
    false,
  );
});

test('three failed tries since the claim stop the resume', () => {
  assert.equal(
    check(minutesAgo(60), [
      { outcome: 'failed', attemptedAt: minutesAgo(59) },
      { outcome: 'failed', attemptedAt: minutesAgo(40) },
      { outcome: 'failed', attemptedAt: minutesAgo(20) },
    ]),
    false,
  );
});

test('failures from before the claim do not count against it', () => {
  // A dispatch that failed before claiming (e.g. the package check) and was
  // claimed on a later run.
  assert.equal(
    check(minutesAgo(60), [
      { outcome: 'failed', attemptedAt: minutesAgo(90) },
      { outcome: 'failed', attemptedAt: minutesAgo(80) },
      { outcome: 'failed', attemptedAt: minutesAgo(70) },
    ]),
    true,
  );
});
