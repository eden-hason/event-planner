import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countAnswerSources } from './counts';

test('countAnswerSources counts answered Guest Records per source', () => {
  const counts = countAnswerSources([
    { rsvpStatus: 'confirmed', rsvpChangeSource: 'guest' },
    { rsvpStatus: 'declined', rsvpChangeSource: 'guest' },
    { rsvpStatus: 'confirmed', rsvpChangeSource: 'admin_call' },
    { rsvpStatus: 'confirmed', rsvpChangeSource: 'manual' },
  ]);
  assert.deepEqual(counts, { guest: 2, call: 1, list: 1, total: 4 });
});

test('countAnswerSources leaves out pending rows and rows with no source', () => {
  const counts = countAnswerSources([
    { rsvpStatus: 'pending', rsvpChangeSource: 'guest' },
    { rsvpStatus: 'confirmed', rsvpChangeSource: null },
    { rsvpStatus: 'declined' },
    { rsvpStatus: 'confirmed', rsvpChangeSource: 'admin_call' },
  ]);
  assert.deepEqual(counts, { guest: 0, call: 1, list: 0, total: 1 });
});

test('countAnswerSources is all zeros when nobody answered', () => {
  assert.deepEqual(countAnswerSources([]), { guest: 0, call: 0, list: 0, total: 0 });
});
