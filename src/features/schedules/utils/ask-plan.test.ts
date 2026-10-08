import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasNoAskPlanned } from './ask-plan';

const DUE = '2026-10-01T07:00:00Z';
const row = (scheduleTypeKey: string, scheduledDate: string | null = null) => ({
  scheduleTypeKey,
  scheduledDate,
});

test('a freshly seeded plan has no ask planned', () => {
  assert.equal(
    hasNoAskPlanned([
      row('initial_invitation'),
      row('confirmation'),
      row('confirmation'),
      row('event_reminder', DUE),
      row('post_event', DUE),
    ]),
    true,
  );
});

test('dating any one ask clears it - an Invitation left undated is fine', () => {
  assert.equal(
    hasNoAskPlanned([row('initial_invitation'), row('confirmation', DUE), row('confirmation')]),
    false,
  );
});

test('a dated Reminder or Thank You is not an ask', () => {
  assert.equal(hasNoAskPlanned([row('confirmation'), row('event_reminder', DUE)]), true);
});

test('a plan with no asks at all has nothing to date', () => {
  assert.equal(hasNoAskPlanned([row('event_reminder', DUE)]), false);
  assert.equal(hasNoAskPlanned([]), false);
});
