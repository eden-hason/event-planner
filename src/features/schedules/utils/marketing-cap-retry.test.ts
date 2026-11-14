import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  endedByAnswer,
  isMarketingCapCode,
  marketingCapRetry,
  type MarketingCapRetryInput,
} from './marketing-cap-retry';

const WINDOW = { start: '09:00', end: '21:00' };

// 2026-11-15 10:00 Israel (UTC+2 in November).
const FIRST_FAILURE = '2026-11-15T08:00:00.000Z';

function capFailure(createdAt: string, code = 131049) {
  return { channel: 'whatsapp', status: 'failed', error_code: code, created_at: createdAt };
}

function input(overrides: Partial<MarketingCapRetryInput> = {}): MarketingCapRetryInput {
  return {
    scheduleTypeKey: 'confirmation',
    rsvpStatus: 'pending',
    attempts: [capFailure(FIRST_FAILURE)],
    sendWindow: WINDOW,
    now: new Date('2026-11-15T09:00:00.000Z'),
    ...overrides,
  };
}

test('both marketing codes count, nothing else does', () => {
  assert.equal(isMarketingCapCode(131049), true);
  assert.equal(isMarketingCapCode(130472), true);
  assert.equal(isMarketingCapCode(131026), false);
  assert.equal(isMarketingCapCode(null), false);
});

test('the first retry is 6 hours after the first failure', () => {
  const retry = marketingCapRetry(input());
  assert.equal(retry?.dueAt.toISOString(), '2026-11-15T14:00:00.000Z');
  assert.equal(retry?.rung, 1);
});

test('the second retry is 24 hours after the first failure, not after the second', () => {
  const retry = marketingCapRetry(
    input({
      attempts: [capFailure(FIRST_FAILURE), capFailure('2026-11-15T14:00:00.000Z', 130472)],
      now: new Date('2026-11-15T15:00:00.000Z'),
    }),
  );
  assert.equal(retry?.dueAt.toISOString(), '2026-11-16T08:00:00.000Z');
  assert.equal(retry?.rung, 2);
});

test('after two retries the ladder is spent and the SMS Fallback takes over', () => {
  const retry = marketingCapRetry(
    input({
      attempts: [
        capFailure(FIRST_FAILURE),
        capFailure('2026-11-15T14:00:00.000Z'),
        capFailure('2026-11-16T08:00:00.000Z'),
      ],
      now: new Date('2026-11-16T09:00:00.000Z'),
    }),
  );
  assert.equal(retry, null);
});

test('a retry that would land after the Send Window closes waits for the morning', () => {
  // 18:00 Israel + 6h = 00:00, so 09:00 the next day.
  const retry = marketingCapRetry(
    input({ attempts: [capFailure('2026-11-15T16:00:00.000Z')], now: new Date('2026-11-15T17:00:00.000Z') }),
  );
  assert.equal(retry?.dueAt.toISOString(), '2026-11-16T07:00:00.000Z');
});

test('only an Ask is retried', () => {
  assert.equal(marketingCapRetry(input({ scheduleTypeKey: 'event_reminder' })), null);
  assert.equal(marketingCapRetry(input({ scheduleTypeKey: 'post_event' })), null);
  assert.equal(marketingCapRetry(input({ scheduleTypeKey: 'initial_invitation' })), null);
  assert.ok(marketingCapRetry(input({ scheduleTypeKey: 'invitation' })));
  assert.ok(marketingCapRetry(input({ scheduleTypeKey: 'follow_up' })));
});

test('a Guest who answered meanwhile is sent nothing further', () => {
  assert.equal(marketingCapRetry(input({ rsvpStatus: 'confirmed' })), null);
  assert.equal(marketingCapRetry(input({ rsvpStatus: 'declined' })), null);
});

test('any other failure code keeps the immediate SMS Fallback', () => {
  assert.equal(
    marketingCapRetry(input({ attempts: [capFailure(FIRST_FAILURE, 131026)] })),
    null,
  );
});

test('the latest attempt decides: a later non-cap failure ends the ladder', () => {
  assert.equal(
    marketingCapRetry(
      input({ attempts: [capFailure(FIRST_FAILURE), capFailure('2026-11-15T14:00:00.000Z', 131026)] }),
    ),
    null,
  );
});

test('an SMS attempt or an arrived message ends it', () => {
  assert.equal(
    marketingCapRetry(
      input({
        attempts: [
          capFailure(FIRST_FAILURE),
          { channel: 'sms', status: 'sent', error_code: null, created_at: '2026-11-15T09:00:00.000Z' },
        ],
      }),
    ),
    null,
  );
  assert.equal(
    marketingCapRetry(
      input({
        attempts: [
          capFailure(FIRST_FAILURE),
          { channel: 'whatsapp', status: 'delivered', error_code: null, created_at: '2026-11-15T14:00:00.000Z' },
        ],
      }),
    ),
    null,
  );
});

test('a retry in flight is still awaiting, so the SMS stays held', () => {
  const retry = marketingCapRetry(
    input({
      attempts: [
        capFailure(FIRST_FAILURE),
        { channel: 'whatsapp', status: 'pending', error_code: null, created_at: '2026-11-15T14:00:00.000Z' },
      ],
      now: new Date('2026-11-15T14:00:10.000Z'),
    }),
  );
  assert.ok(retry);
  assert.equal(retry?.inFlight, true);
});

test('a ladder nobody ran within 48 hours is given up, so the SMS still goes', () => {
  assert.equal(
    marketingCapRetry(input({ now: new Date('2026-11-17T08:00:01.000Z') })),
    null,
  );
});

test('an answer during the wait ends the ladder with no SMS either', () => {
  assert.equal(endedByAnswer(input({ rsvpStatus: 'confirmed' })), true);
  assert.equal(endedByAnswer(input({ rsvpStatus: 'pending' })), false);
  // Not a marketing-cap failure: the ordinary Fallback rules, whatever the answer.
  assert.equal(
    endedByAnswer(input({ rsvpStatus: 'confirmed', attempts: [capFailure(FIRST_FAILURE, 131026)] })),
    false,
  );
  // Not an Ask.
  assert.equal(endedByAnswer(input({ rsvpStatus: 'confirmed', scheduleTypeKey: 'post_event' })), false);
});
