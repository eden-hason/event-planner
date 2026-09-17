import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyWhatsAppFailure,
  isTransient,
  nextRetryDelayMinutes,
  RETRY_BACKOFF_MINUTES,
  // @ts-expect-error Node's type-stripping test runner requires the source extension
} from './whatsapp-failures.ts';

// ─── What may be retried ──────────────────────────────────────────────────────

test('Meta throughput and capacity codes are transient', () => {
  for (const code of [130429, 131056, 133016]) {
    assert.equal(isTransient(code, 400), true, `${code} should be transient`);
  }
});

test('429 and 5xx are transient whatever code came with them', () => {
  assert.equal(isTransient(undefined, 429), true);
  assert.equal(isTransient(null, 500), true);
  assert.equal(isTransient(null, 502), true);
  assert.equal(isTransient(null, 503), true);
  assert.equal(isTransient(999999, 500), true);
});

test('guest-level failures never retry', () => {
  // A number that is not on WhatsApp will not be on WhatsApp in fifteen
  // minutes. Retrying costs a send and changes nothing; the SMS Fallback is
  // the remedy for these.
  for (const code of [131026, 131049, 131050, 130472, 131021]) {
    assert.equal(isTransient(code, 400), false, `${code} should not retry`);
    assert.equal(classifyWhatsAppFailure(code), 'guest');
  }
});

test('an ordinary 4xx rejection does not retry', () => {
  assert.equal(isTransient(132000, 400), false); // template param mismatch
  assert.equal(isTransient(null, 401), false); // bad token
  assert.equal(isTransient(null, 400), false);
});

test('transient codes stay system-level, which keeps them out of the SMS batch', () => {
  // Load-bearing: a throughput failure is Kululu's problem, and paying for an
  // SMS to everyone is the wrong remedy for it.
  for (const code of [130429, 131056, 133016]) {
    assert.equal(classifyWhatsAppFailure(code), 'system');
  }
});

test('an unknown code with no HTTP status does not retry', () => {
  // The catch-all has to be "do not retry": an unrecognised failure of unknown
  // cause is exactly the case where sending again might duplicate.
  assert.equal(isTransient(null, undefined), false);
  assert.equal(isTransient(undefined, undefined), false);
});

// ─── The ladder ───────────────────────────────────────────────────────────────

test('the backoff ladder is one, five and fifteen minutes', () => {
  assert.deepEqual(RETRY_BACKOFF_MINUTES, [1, 5, 15]);
});

test('the ladder is walked by attempt count and then gives up', () => {
  assert.equal(nextRetryDelayMinutes(1), 1); // after the first attempt
  assert.equal(nextRetryDelayMinutes(2), 5);
  assert.equal(nextRetryDelayMinutes(3), 15);
  assert.equal(nextRetryDelayMinutes(4), null); // three attempts is the cap
  assert.equal(nextRetryDelayMinutes(10), null);
});

test('a nonsensical attempt count does not restart the ladder', () => {
  assert.equal(nextRetryDelayMinutes(0), 1);
  assert.equal(nextRetryDelayMinutes(-3), 1);
});
