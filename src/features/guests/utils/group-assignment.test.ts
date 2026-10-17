import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { draftChanges, groupAssignmentStats, matchesNameOrPhone, membershipStanding, withoutPendingDeletes } from './group-assignment.ts';

const groups = [
  { id: 'b', side: 'bride' as const },
  { id: 'g', side: 'groom' as const },
  { id: 's', side: null },
];

test('records are counted by the side of their group, and the rest as unassigned', () => {
  const stats = groupAssignmentStats(
    [
      { groupId: 'b' },
      { groupId: 'b' },
      { groupId: 'g' },
      { groupId: 's' },
      { groupId: null },
    ],
    groups,
  );
  assert.deepEqual(stats, {
    bride: 2,
    groom: 1,
    shared: 1,
    unassigned: 1,
    total: 5,
    assignedPct: 80,
  });
});

test('a held delete drops its group and leaves its records unassigned', () => {
  const view = withoutPendingDeletes(
    groups,
    [{ groupId: 'b' }, { groupId: 'g' }],
    new Set(['b']),
  );
  assert.deepEqual(
    view.groups.map((g) => g.id),
    ['g', 's'],
  );
  assert.deepEqual(view.guests, [{ groupId: null }, { groupId: 'g' }]);
  assert.equal(groupAssignmentStats(view.guests, view.groups).unassigned, 1);
});

test('with nothing held the same arrays come back', () => {
  const guests = [{ groupId: 'b' }];
  const view = withoutPendingDeletes(groups, guests, new Set());
  assert.equal(view.groups, groups);
  assert.equal(view.guests, guests);
});

test('an event with no records is 0% assigned, not NaN', () => {
  assert.equal(groupAssignmentStats([], groups).assignedPct, 0);
});

test('the draft diff counts additions and removals against the saved members', () => {
  const saved = new Set(['a', 'b', 'c']);
  assert.deepEqual(draftChanges(saved, new Set(['a', 'b', 'c'])), {
    added: 0,
    removed: 0,
    dirty: false,
  });
  assert.deepEqual(draftChanges(saved, new Set(['a', 'x', 'y'])), {
    added: 2,
    removed: 2,
    dirty: true,
  });
});

test('a search matches the name, or the phone in its stored or local form', () => {
  const guest = { name: 'טליה שמש', phone: '+972546621903' };
  assert.equal(matchesNameOrPhone(guest, ''), true);
  assert.equal(matchesNameOrPhone(guest, 'טליה'), true);
  assert.equal(matchesNameOrPhone(guest, '0546'), true);
  assert.equal(matchesNameOrPhone(guest, '054-662'), true);
  assert.equal(matchesNameOrPhone(guest, '97254'), true);
  assert.equal(matchesNameOrPhone(guest, '0521'), false);
  assert.equal(matchesNameOrPhone(guest, 'דני'), false);
});

test('a record with no phone matches by name only', () => {
  assert.equal(
    matchesNameOrPhone({ name: 'נדב כץ', phone: null }, '05'),
    false,
  );
  assert.equal(matchesNameOrPhone({ name: 'נדב כץ' }, 'נדב'), true);
});

test('a record stands in or out as saved, or moving when the draft disagrees', () => {
  const saved = new Set(['a', 'b']);
  const draft = new Set(['a', 'c']);
  assert.equal(membershipStanding('a', saved, draft), 'in');
  assert.equal(membershipStanding('b', saved, draft), 'leaving');
  assert.equal(membershipStanding('c', saved, draft), 'joining');
  assert.equal(membershipStanding('d', saved, draft), 'out');
});
