import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { amountDisplay, isOwnerOverride, resolveAmounts } from './guest-amount.ts';

type Guest = Parameters<typeof amountDisplay>[0];

const guest = (over: Partial<Guest>): Guest => ({
  rsvpStatus: 'confirmed',
  amount: 2,
  invitedAmount: 2,
  rsvpChangeSource: 'guest',
  ...over,
});

test('a record nobody has answered shows the invitation', () => {
  assert.deepEqual(
    amountDisplay(
      guest({
        rsvpStatus: 'pending',
        amount: 3,
        invitedAmount: 3,
        rsvpChangeSource: null,
      }),
    ),
    {
      value: 3,
      invited: 3,
      changedByGuest: false,
    },
  );
});

test('a confirmed record shows how many are coming', () => {
  assert.equal(amountDisplay(guest({ amount: 2, invitedAmount: 2 })).value, 2);
});

test('a Guest who answered a different count is flagged, fewer or more', () => {
  assert.equal(
    amountDisplay(guest({ amount: 3, invitedAmount: 4 })).changedByGuest,
    true,
  );
  assert.equal(
    amountDisplay(guest({ amount: 5, invitedAmount: 4 })).changedByGuest,
    true,
  );
  assert.equal(amountDisplay(guest({ amount: 5, invitedAmount: 4 })).value, 5);
});

test('an answer relayed on a call is still the Guest’s own count', () => {
  assert.equal(
    amountDisplay(
      guest({ amount: 1, invitedAmount: 2, rsvpChangeSource: 'admin_call' }),
    ).changedByGuest,
    true,
  );
});

test('a count the Owner typed in is theirs, not a change by the Guest', () => {
  const shown = amountDisplay(
    guest({ amount: 1, invitedAmount: 2, rsvpChangeSource: 'manual' }),
  );
  assert.equal(shown.changedByGuest, false);
  assert.equal(shown.value, 1);
});

test('a declined or pending record never reads as changed', () => {
  assert.equal(
    amountDisplay(
      guest({ rsvpStatus: 'declined', amount: 1, invitedAmount: 3 }),
    ).changedByGuest,
    false,
  );
  assert.equal(
    amountDisplay(
      guest({ rsvpStatus: 'declined', amount: 1, invitedAmount: 3 }),
    ).value,
    3,
  );
});

test('saving a confirmed record keeps the invitation and the answer apart', () => {
  assert.deepEqual(
    resolveAmounts({ rsvpStatus: 'confirmed', invited: 4, coming: 3 }),
    {
      invitedAmount: 4,
      amount: 3,
    },
  );
});

test('a record that is not coming is expected at its invitation', () => {
  assert.deepEqual(
    resolveAmounts({ rsvpStatus: 'pending', invited: 4, coming: 3 }),
    {
      invitedAmount: 4,
      amount: 4,
    },
  );
  assert.deepEqual(
    resolveAmounts({ rsvpStatus: 'declined', invited: 2, coming: 5 }),
    {
      invitedAmount: 2,
      amount: 2,
    },
  );
});

test('counts below one are lifted to one', () => {
  assert.deepEqual(
    resolveAmounts({ rsvpStatus: 'confirmed', invited: 0, coming: 0 }),
    {
      invitedAmount: 1,
      amount: 1,
    },
  );
});

test('changing the status is the Owner’s answer', () => {
  assert.equal(
    isOwnerOverride({
      before: { rsvpStatus: 'pending', amount: 2 },
      after: { rsvpStatus: 'confirmed', amount: 2 },
    }),
    true,
  );
});

test('changing how many are coming on a confirmed record overrides the Guest', () => {
  assert.equal(
    isOwnerOverride({
      before: { rsvpStatus: 'confirmed', amount: 3 },
      after: { rsvpStatus: 'confirmed', amount: 4 },
    }),
    true,
  );
});

test('saving a confirmed record untouched leaves the Guest’s answer theirs', () => {
  assert.equal(
    isOwnerOverride({
      before: { rsvpStatus: 'confirmed', amount: 3 },
      after: { rsvpStatus: 'confirmed', amount: 3 },
    }),
    false,
  );
  assert.equal(
    isOwnerOverride({
      before: { rsvpStatus: 'confirmed', amount: 3 },
      after: { rsvpStatus: undefined, amount: undefined },
    }),
    false,
  );
});

test('re-inviting a record nobody has answered is not an answer', () => {
  assert.equal(
    isOwnerOverride({
      before: { rsvpStatus: 'pending', amount: 2 },
      after: { rsvpStatus: 'pending', amount: 4 },
    }),
    false,
  );
});
