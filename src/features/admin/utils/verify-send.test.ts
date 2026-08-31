import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import * as verify from './verify-send.ts';

const marks = {
  'guest-1': { mark: 'received' as const, name: 'Dana', phone: '+972545451963' },
  'guest-2': { mark: 'not-received' as const, name: 'Yossi', phone: '+972501112222' },
  'guest-3': { mark: 'not-received' as const, name: 'Maya', phone: '+972523334444' },
};

test('the storage key is scoped to one schedule', () => {
  assert.notEqual(verify.verifyStorageKey('schedule-a'), verify.verifyStorageKey('schedule-b'));
  assert.ok(verify.verifyStorageKey('schedule-a').includes('schedule-a'));
});

test('a run survives a round trip through storage', () => {
  assert.deepEqual(verify.parseVerifyMarks(verify.serializeVerifyMarks(marks)), marks);
});

test('unreadable storage opens an empty run instead of throwing', () => {
  for (const raw of [null, undefined, '', 'not json', '[]', '"a string"', '7']) {
    assert.deepEqual(verify.parseVerifyMarks(raw), {});
  }
});

test('entries that are not marks are dropped, the rest are kept', () => {
  const parsed = verify.parseVerifyMarks(
    JSON.stringify({
      'guest-1': { mark: 'received' as const, name: 'Dana', phone: '+972545451963' },
      'guest-bad-mark': { mark: 'maybe', name: 'Noa', phone: '+972500000000' },
      'guest-missing-name': { mark: 'received' as const, phone: '+972500000000' },
      'guest-null': null,
    }),
  );
  assert.deepEqual(Object.keys(parsed), ['guest-1']);
});

test('the tally counts both marks and nothing else', () => {
  assert.deepEqual(verify.tallyVerifyMarks(marks), { received: 1, notReceived: 2, total: 3 });
  assert.deepEqual(verify.tallyVerifyMarks({}), { received: 0, notReceived: 0, total: 0 });
});

test('the end-of-run list is only the not-received guests', () => {
  assert.deepEqual(
    verify.notReceivedRecords(marks).map((record) => record.name),
    ['Yossi', 'Maya'],
  );
});

test('the copied list is one tab separated guest per line', () => {
  assert.equal(
    verify.formatNotReceivedForClipboard(verify.notReceivedRecords(marks)),
    'Yossi\t+972501112222\nMaya\t+972523334444',
  );
  assert.equal(verify.formatNotReceivedForClipboard([]), '');
});
