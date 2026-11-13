import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  moveRefusal,
  moveRefusalLabel,
  movedMessage,
  newEventPlanSavedMessage,
  parseMoveRefusal,
  parseNewEventMessagePlan,
  type MoveRefusal,
} from './message-plan';

test('a Classic Event with nothing sent may move', () => {
  assert.equal(moveRefusal({ messagePlan: 'classic', messagesSent: false }), null);
});

test('an Event that sent anything stays Classic', () => {
  assert.equal(moveRefusal({ messagePlan: 'classic', messagesSent: true }), 'sent');
});

test('an Event already on the current plan has nowhere to move', () => {
  assert.equal(moveRefusal({ messagePlan: 'current', messagesSent: false }), 'already_current');
  assert.equal(moveRefusal({ messagePlan: 'current', messagesSent: true }), 'already_current');
});

test('every refusal the function raises reads as Hebrew', () => {
  const codes: MoveRefusal[] = ['not_found', 'already_current', 'sent'];
  for (const code of codes) {
    const label = moveRefusalLabel(code);
    assert.match(label, /[֐-׿]/);
    assert.ok(!label.endsWith('.'));
  }
});

test('the refusal is read from the error DETAIL, and nothing else counts', () => {
  assert.equal(parseMoveRefusal({ details: 'sent' }), 'sent');
  assert.equal(parseMoveRefusal({ details: 'not_found' }), 'not_found');
  assert.equal(parseMoveRefusal({ details: ' already_current ' }), 'already_current');
  assert.equal(parseMoveRefusal({ details: 'Key (id) is not present' }), null);
  assert.equal(parseMoveRefusal({ details: null }), null);
  assert.equal(parseMoveRefusal(null), null);
});

test('a move that seeded nothing says the plan comes with a date and type', () => {
  assert.notEqual(movedMessage(5), movedMessage(0));
  assert.match(movedMessage(0), /תאריך/);
});

test('the setting reads Classic unless it is current', () => {
  assert.equal(parseNewEventMessagePlan('current'), 'current');
  assert.equal(parseNewEventMessagePlan('classic'), 'classic');
  assert.equal(parseNewEventMessagePlan(null), 'classic');
  assert.equal(parseNewEventMessagePlan('v2'), 'classic');
});

test('the saved message names the plan new Events get', () => {
  assert.match(newEventPlanSavedMessage('current'), /החדשה/);
  assert.match(newEventPlanSavedMessage('classic'), /הקלאסית/);
});
