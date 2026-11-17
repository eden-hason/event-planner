import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { rsvpHeadcounts } from './rsvp-headcounts.ts';

test('counts people, not records', () => {
  assert.deepEqual(
    rsvpHeadcounts([
      { rsvpStatus: 'confirmed', amount: 3, invitedAmount: 2 },
      { rsvpStatus: 'pending', amount: 2, invitedAmount: 2 },
      { rsvpStatus: 'declined', amount: 1, invitedAmount: 1 },
    ]),
    { total: 6, confirmed: 3, pending: 2, declined: 1 },
  );
});

test('a Guest who confirmed for 4 and then declined counts at the invitation', () => {
  assert.deepEqual(
    rsvpHeadcounts([
      { rsvpStatus: 'declined', amount: 4, invitedAmount: 1 },
      { rsvpStatus: 'declined', amount: 1, invitedAmount: 1 },
      { rsvpStatus: 'declined', amount: 1, invitedAmount: 1 },
    ]),
    { total: 3, confirmed: 0, pending: 0, declined: 3 },
  );
});

test('a confirmed Guest counts at their answer, above the invitation or below', () => {
  assert.equal(
    rsvpHeadcounts([
      { rsvpStatus: 'confirmed', amount: 5, invitedAmount: 2 },
      { rsvpStatus: 'confirmed', amount: 1, invitedAmount: 3 },
    ]).confirmed,
    6,
  );
});
