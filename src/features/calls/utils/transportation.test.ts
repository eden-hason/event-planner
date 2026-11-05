import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { callTransportationRefusal } from './transportation.ts';

test('a confirmed record on an Event that asks takes a yes or a no', () => {
  assert.equal(callTransportationRefusal({ asked: true, rsvpStatus: 'confirmed', value: true }), null);
  assert.equal(callTransportationRefusal({ asked: true, rsvpStatus: 'confirmed', value: false }), null);
});

test('an Event that does not ask the question takes no answer', () => {
  assert.notEqual(
    callTransportationRefusal({ asked: false, rsvpStatus: 'confirmed', value: true }),
    null,
  );
});

test('only a confirmed record takes an answer', () => {
  for (const rsvpStatus of ['pending', 'declined', null]) {
    assert.notEqual(callTransportationRefusal({ asked: true, rsvpStatus, value: false }), null);
  }
});

test('clearing back to unanswered is always allowed', () => {
  assert.equal(callTransportationRefusal({ asked: false, rsvpStatus: 'declined', value: null }), null);
});
