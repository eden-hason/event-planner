import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { deleteImpact, rsvpImpact } from './bulk-impact.ts';

type Guest = Parameters<typeof rsvpImpact>[0][number];

const guest = (over: Partial<Guest> = {}): Guest => ({
  id: over.id ?? Math.random().toString(36),
  rsvpStatus: 'pending',
  rsvpChangeSource: null,
  tableId: null,
  ...over,
});

test('declining replaces the answers Guests gave themselves and ends their seats', () => {
  const impact = rsvpImpact(
    [
      guest({
        rsvpStatus: 'confirmed',
        rsvpChangeSource: 'guest',
        tableId: 't1',
      }),
      guest({ rsvpStatus: 'confirmed', rsvpChangeSource: 'guest' }),
      guest({
        rsvpStatus: 'confirmed',
        rsvpChangeSource: 'manual',
        tableId: 't2',
      }),
      guest({ rsvpStatus: 'pending' }),
    ],
    'declined',
  );
  assert.deepEqual(impact, {
    total: 4,
    changing: 4,
    answeredThemselves: 2,
    losingSeat: 2,
    needsConfirm: true,
  });
});

test('a Guest whose own answer already matches is not "replaced"', () => {
  const impact = rsvpImpact(
    [guest({ rsvpStatus: 'declined', rsvpChangeSource: 'guest' })],
    'declined',
  );
  assert.equal(impact.answeredThemselves, 0);
  assert.equal(impact.changing, 0);
  assert.equal(impact.needsConfirm, false);
});

test('an answer the Owner or a call recorded is not one the Guest gave', () => {
  const impact = rsvpImpact(
    [
      guest({ rsvpStatus: 'declined', rsvpChangeSource: 'manual' }),
      guest({ rsvpStatus: 'declined', rsvpChangeSource: 'admin_call' }),
    ],
    'confirmed',
  );
  assert.equal(impact.answeredThemselves, 0);
  assert.equal(impact.needsConfirm, false);
});

test('confirming never costs a seat', () => {
  const impact = rsvpImpact(
    [guest({ rsvpStatus: 'pending', tableId: 't1' })],
    'confirmed',
  );
  assert.equal(impact.losingSeat, 0);
});

test('a seated Guest Record already declined has no seat left to lose', () => {
  const impact = rsvpImpact(
    [guest({ rsvpStatus: 'declined', tableId: 't1' })],
    'declined',
  );
  assert.equal(impact.losingSeat, 0);
});

test('delete counts who has been messaged and who answered for themselves', () => {
  const a = guest({
    id: 'a',
    rsvpChangeSource: 'guest',
    rsvpStatus: 'confirmed',
  });
  const b = guest({ id: 'b' });
  const c = guest({
    id: 'c',
    rsvpChangeSource: 'manual',
    rsvpStatus: 'confirmed',
  });
  const impact = deleteImpact([a, b, c], new Set(['a', 'b', 'elsewhere']), 10);
  assert.deepEqual(impact, {
    total: 3,
    messaged: 2,
    answeredThemselves: 1,
    isWholeList: false,
  });
});

test('deleting every Guest Record on the list is the strong case', () => {
  const all = [guest({ id: 'a' }), guest({ id: 'b' })];
  assert.equal(deleteImpact(all, new Set(), 2).isWholeList, true);
});
