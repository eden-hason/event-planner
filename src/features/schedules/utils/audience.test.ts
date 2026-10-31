import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { audienceLabelKey, inAudience } from './audience.ts';

test('no target is every Guest', () => {
  for (const rsvp of ['pending', 'confirmed', 'declined']) {
    assert.equal(inAudience(null, rsvp), true);
  }
});

test('a status target is that status only', () => {
  assert.equal(inAudience('pending', 'pending'), true);
  assert.equal(inAudience('pending', 'confirmed'), false);
  assert.equal(inAudience('confirmed', 'declined'), false);
});

test('not_declined is everyone but those who said they are not coming', () => {
  assert.equal(inAudience('not_declined', 'pending'), true);
  assert.equal(inAudience('not_declined', 'confirmed'), true);
  assert.equal(inAudience('not_declined', 'declined'), false);
});

test('every audience has a label', () => {
  assert.equal(audienceLabelKey(null), 'allGuests');
  assert.equal(audienceLabelKey('pending'), 'pendingGuests');
  assert.equal(audienceLabelKey('confirmed'), 'confirmedGuests');
  assert.equal(audienceLabelKey('not_declined'), 'notDeclinedGuests');
});
