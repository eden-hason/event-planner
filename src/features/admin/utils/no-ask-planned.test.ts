import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isNoAskPlanned, NO_ASK_PLANNED_DAYS } from './no-ask-planned';

const NOW = new Date('2026-10-07T09:00:00Z');
const inDays = (days: number) =>
  new Date(Date.UTC(2026, 9, 7 + days)).toISOString();
const undatedPlan = [
  { scheduleTypeKey: 'initial_invitation', scheduledDate: null },
  { scheduleTypeKey: 'confirmation', scheduledDate: null },
  { scheduleTypeKey: 'event_reminder', scheduledDate: inDays(10) },
];

test('holds for a sending Event inside the window with no ask dated', () => {
  assert.equal(
    isNoAskPlanned({ eventDate: inDays(10), canSend: true, schedules: undatedPlan, now: NOW }),
    true,
  );
  assert.equal(
    isNoAskPlanned({
      eventDate: inDays(NO_ASK_PLANNED_DAYS),
      canSend: true,
      schedules: undatedPlan,
      now: NOW,
    }),
    true,
  );
});

test('waits until the Event is inside the window', () => {
  assert.equal(
    isNoAskPlanned({
      eventDate: inDays(NO_ASK_PLANNED_DAYS + 1),
      canSend: true,
      schedules: undatedPlan,
      now: NOW,
    }),
    false,
  );
});

test('an Event that cannot send, or is over, is not chased', () => {
  assert.equal(
    isNoAskPlanned({ eventDate: inDays(10), canSend: false, schedules: undatedPlan, now: NOW }),
    false,
  );
  assert.equal(
    isNoAskPlanned({ eventDate: inDays(-1), canSend: true, schedules: undatedPlan, now: NOW }),
    false,
  );
});

test('clears once any ask is dated', () => {
  const dated = [
    { scheduleTypeKey: 'initial_invitation', scheduledDate: null },
    { scheduleTypeKey: 'confirmation', scheduledDate: inDays(5) },
  ];
  assert.equal(
    isNoAskPlanned({ eventDate: inDays(10), canSend: true, schedules: dated, now: NOW }),
    false,
  );
});
