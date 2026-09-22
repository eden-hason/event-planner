import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summariseOutstandingPlan } from './outstanding-plan';

const row = (
  overrides: Partial<{
    status: string | null;
    scheduleTypeKey: string;
    executionKind: string | null;
  }> = {},
) => ({
  status: null as string | null,
  scheduleTypeKey: 'invitation',
  executionKind: 'message' as string | null,
  ...overrides,
});

test('counts armed message schedules', () => {
  const summary = summariseOutstandingPlan([row(), row(), row()]);
  assert.equal(summary.messageCount, 3);
  assert.equal(summary.includesEventReminder, false);
});

test('an empty plan strands nothing', () => {
  assert.deepEqual(summariseOutstandingPlan([]), {
    messageCount: 0,
    includesEventReminder: false,
  });
});

test('history, decisions and misses are not stranded', () => {
  const summary = summariseOutstandingPlan([
    row({ status: 'sent' }),
    row({ status: 'cancelled' }),
    row({ status: 'expired' }),
  ]);
  assert.equal(summary.messageCount, 0);
});

test('a disabled schedule still carries its date', () => {
  const summary = summariseOutstandingPlan([row({ status: 'disabled' })]);
  assert.equal(summary.messageCount, 1);
});

test('names the day-of reminder when it is still armed', () => {
  const summary = summariseOutstandingPlan([
    row(),
    row({ scheduleTypeKey: 'event_reminder' }),
  ]);
  assert.equal(summary.messageCount, 2);
  assert.equal(summary.includesEventReminder, true);
});

test('a sent reminder is not named', () => {
  const summary = summariseOutstandingPlan([
    row({ scheduleTypeKey: 'event_reminder', status: 'sent' }),
  ]);
  assert.equal(summary.includesEventReminder, false);
});

test('call rounds are outstanding but not counted as messages', () => {
  const summary = summariseOutstandingPlan([
    row({ executionKind: 'call_round', scheduleTypeKey: 'confirmation' }),
    row(),
  ]);
  assert.equal(summary.messageCount, 1);
});

test('a row with no execution kind counts as a message', () => {
  const summary = summariseOutstandingPlan([row({ executionKind: null })]);
  assert.equal(summary.messageCount, 1);
});
