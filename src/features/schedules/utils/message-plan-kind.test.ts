import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAsk, isCurrentPlanOnlyType, parseMessagePlan, scheduleChannel } from './message-plan-kind';

test('an Ask is a Classic Confirmation or a current Invitation or Follow-up', () => {
  for (const key of ['confirmation', 'invitation', 'follow_up']) assert.equal(isAsk(key), true, key);
  for (const key of ['initial_invitation', 'advance_reminder', 'event_reminder', 'post_event', 'phone_call', '', null, undefined]) {
    assert.equal(isAsk(key), false, String(key));
  }
});

test('only current is current: a missing or unknown plan reads as Classic', () => {
  assert.equal(parseMessagePlan('current'), 'current');
  for (const value of ['classic', undefined, null, 'CURRENT', 1]) {
    assert.equal(parseMessagePlan(value), 'classic');
  }
});

test('invitation and follow_up belong to the current plan only; shared types do not', () => {
  assert.equal(isCurrentPlanOnlyType('invitation'), true);
  assert.equal(isCurrentPlanOnlyType('follow_up'), true);
  assert.equal(isCurrentPlanOnlyType('event_reminder'), false);
  assert.equal(isCurrentPlanOnlyType('post_event'), false);
});

test('the current plan always sends WhatsApp; Classic keeps its catalog channel', () => {
  assert.equal(scheduleChannel(null, 'current'), 'whatsapp');
  assert.equal(scheduleChannel('sms', 'classic'), 'sms');
  assert.equal(scheduleChannel(null, 'classic'), null);
});
