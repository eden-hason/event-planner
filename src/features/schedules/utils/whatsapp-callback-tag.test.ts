import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attemptTag,
  conversationTag,
  parseCallbackTag,
  TEST_MESSAGE_TAG,
} from './whatsapp-callback-tag';

const ID = '3f2c1a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f';

test('an attempt tag round-trips to its attempt id', () => {
  assert.deepEqual(parseCallbackTag(attemptTag(ID)), { kind: 'attempt', attemptId: ID });
});

test('a conversation tag round-trips to its inbound message id', () => {
  assert.deepEqual(parseCallbackTag(conversationTag(ID)), {
    kind: 'conversation',
    inboundMessageId: ID,
  });
});

test('the test message tag is recognised', () => {
  assert.deepEqual(parseCallbackTag(TEST_MESSAGE_TAG), { kind: 'test' });
});

test('tags stay well inside Meta’s 512-character limit', () => {
  assert.ok(attemptTag(ID).length < 64);
  assert.ok(conversationTag(ID).length < 64);
});

test('no tag, or one Kululu did not write, reads as untagged', () => {
  assert.equal(parseCallbackTag(undefined), null);
  assert.equal(parseCallbackTag(null), null);
  assert.equal(parseCallbackTag(''), null);
  assert.equal(parseCallbackTag('attempt:'), null);
  assert.equal(parseCallbackTag(':abc'), null);
  assert.equal(parseCallbackTag('campaign:42'), null);
  assert.equal(parseCallbackTag('attempt:42'), null);
  assert.equal(parseCallbackTag(`conversation:${ID}-extra`), null);
  assert.equal(parseCallbackTag('something else'), null);
});
