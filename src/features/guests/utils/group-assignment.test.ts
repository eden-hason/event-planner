import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { draftChanges, groupAssignmentStats, withoutPendingDeletes } from './group-assignment.ts';

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
  assert.deepEqual(view.groups.map((g) => g.id), ['g', 's']);
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
