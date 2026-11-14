import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  endedByAnswer,
  isMarketingCapCode,
  marketingCapRetry,
  marketingCapRetryWindow,
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
    rsvpChangedAt: null,
    eventDate: null,
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

test('after two retries they are spent and the SMS Fallback takes over', () => {
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

test('a retry is never due in the last half hour of the Send Window', () => {
  assert.deepEqual(marketingCapRetryWindow(WINDOW), { start: '09:00', end: '20:30' });
  // 14:45 Israel + 6h = 20:45, inside the window but past the margin.
  const retry = marketingCapRetry(
    input({ attempts: [capFailure('2026-11-15T12:45:00.000Z')], now: new Date('2026-11-15T13:00:00.000Z') }),
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

test('a Guest who answered after the failure is sent nothing further', () => {
  const answered = { rsvpStatus: 'confirmed', rsvpChangedAt: '2026-11-15T08:30:00.000Z' };
  assert.equal(marketingCapRetry(input(answered)), null);
  assert.equal(endedByAnswer(input(answered)), true);
});

test('a Guest who had answered before the failure is still retried', () => {
  // The current plan's Invitation goes to every Guest, the confirmed ones too.
  const before = { rsvpStatus: 'confirmed', rsvpChangedAt: '2026-11-10T08:00:00.000Z' };
  assert.ok(marketingCapRetry(input(before)));
  assert.equal(endedByAnswer(input(before)), false);
  // An answer with no recorded time is treated as given before.
  assert.ok(marketingCapRetry(input({ rsvpStatus: 'declined', rsvpChangedAt: null })));
});

test('an answer ends only the marketing-cap case', () => {
  const answered = { rsvpStatus: 'confirmed', rsvpChangedAt: '2026-11-15T08:30:00.000Z' };
  assert.equal(endedByAnswer(input({ ...answered, attempts: [capFailure(FIRST_FAILURE, 131026)] })), false);
  assert.equal(endedByAnswer(input({ ...answered, scheduleTypeKey: 'post_event' })), false);
  assert.equal(endedByAnswer(input({ rsvpStatus: 'pending' })), false);
});

test('any other failure code keeps the immediate SMS Fallback', () => {
  assert.equal(marketingCapRetry(input({ attempts: [capFailure(FIRST_FAILURE, 131026)] })), null);
});

test('the latest attempt decides: a later non-cap failure ends the retries', () => {
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
      now: new Date('2026-11-15T16:00:00.000Z'),
    }),
  );
  assert.ok(retry);
  assert.equal(retry?.inFlight, true);
});

test('a retry not sent within an hour of its due time is given up, so the SMS goes', () => {
  // Due 14:00 UTC: still awaiting at 15:00, given up after.
  assert.ok(marketingCapRetry(input({ now: new Date('2026-11-15T15:00:00.000Z') })));
  assert.equal(marketingCapRetry(input({ now: new Date('2026-11-15T15:00:01.000Z') })), null);
});

test('the grace runs in open Send Window time, so nothing is given up overnight', () => {
  // Due 18:00 Israel (16:00 UTC) with the window closing at 20:30 for retries:
  // 19:00 Israel ends the grace the same evening.
  const evening = input({
    attempts: [capFailure('2026-11-15T10:00:00.000Z')],
    now: new Date('2026-11-15T16:30:00.000Z'),
  });
  assert.ok(marketingCapRetry(evening));
  // Due 20:00 Israel: +1h is 21:00, past the retry window, so the grace ends 09:00.
  const late = input({
    attempts: [capFailure('2026-11-15T12:00:00.000Z')],
    now: new Date('2026-11-15T22:00:00.000Z'),
  });
  assert.ok(marketingCapRetry(late));
});

test('no retry is due on or after the Event', () => {
  // The 6-hour retry falls on the Event day itself.
  assert.equal(marketingCapRetry(input({ eventDate: '2026-11-15T12:00:00.000Z' })), null);
  assert.ok(marketingCapRetry(input({ eventDate: '2026-11-20T00:00:00.000Z' })));
});
