import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advanceReminderPlanRejection,
  MOVE_LOSSES,
  MOVE_SEEDS,
  moveBlock,
  moveBlockLabel,
  movedMessage,
  NEW_EVENT_PLAN_COPY,
  parseMoveRefusal,
  type MoveBlock,
} from './message-plan';
import { ADD_FOLLOW_UP_LABEL } from './labels';

test('a Classic Event with nothing sent may move', () => {
  assert.equal(moveBlock({ messagePlan: 'classic', messagesSent: false }), null);
});

test('an Event that sent anything stays Classic', () => {
  assert.equal(moveBlock({ messagePlan: 'classic', messagesSent: true }), 'sent');
});

test('a sent check that failed blocks the move rather than guessing', () => {
  assert.equal(moveBlock({ messagePlan: 'classic', messagesSent: null }), 'unchecked');
});

test('an Event already on the current plan has nowhere to move', () => {
  assert.equal(moveBlock({ messagePlan: 'current', messagesSent: false }), 'already_current');
  assert.equal(moveBlock({ messagePlan: 'current', messagesSent: null }), 'already_current');
});

test('every refusal and block reads as Hebrew', () => {
  const blocks: MoveBlock[] = ['not_found', 'already_current', 'sent', 'unchecked'];
  for (const block of blocks) {
    const label = moveBlockLabel(block);
    assert.match(label, /[֐-׿]/);
    assert.ok(!label.endsWith('.'));
  }
});

test('the refusal is read from the error DETAIL, and nothing else counts', () => {
  assert.equal(parseMoveRefusal({ details: 'sent' }), 'sent');
  assert.equal(parseMoveRefusal({ details: 'not_found' }), 'not_found');
  assert.equal(parseMoveRefusal({ details: ' already_current ' }), 'already_current');
  // Only the function's codes: the page's own block is not one.
  assert.equal(parseMoveRefusal({ details: 'unchecked' }), null);
  assert.equal(parseMoveRefusal({ details: 'Key (id) is not present' }), null);
  assert.equal(parseMoveRefusal({ details: 'toString' }), null);
  assert.equal(parseMoveRefusal({ details: null }), null);
  assert.equal(parseMoveRefusal(null), null);
});

test('a move that seeded nothing says the plan comes with a date and type', () => {
  assert.notEqual(movedMessage(5), movedMessage(0));
  assert.match(movedMessage(0), /תאריך/);
});

test('the dialog names the Add button the Operator re-grants an Extra Schedule with', () => {
  assert.ok(MOVE_LOSSES.some((loss) => loss.includes(ADD_FOLLOW_UP_LABEL)));
});

test('the dialog names what the move seeds by the Back Office type names', () => {
  assert.match(MOVE_SEEDS, /אישור הגעה חוזר/);
  assert.match(MOVE_SEEDS, /תזכורת אירוע/);
});

test('the saved message names the plan new Events get', () => {
  assert.match(NEW_EVENT_PLAN_COPY.current.saved, /החדשה/);
  assert.match(NEW_EVENT_PLAN_COPY.classic.saved, /הקלאסית/);
});

test('an Advance Reminder is refused on the current plan only', () => {
  assert.ok(advanceReminderPlanRejection('current'));
  assert.equal(advanceReminderPlanRejection('classic'), null);
});
