import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { headerState, hiddenCount, pruneSelection, selectRange, toggleAllVisible, toggleOne } from './guest-selection.ts';

const ids = (set: ReadonlySet<string>) => [...set].sort();

test('toggling adds an unselected record and removes a selected one', () => {
  const once = toggleOne(new Set(), 'a');
  assert.deepEqual(ids(once), ['a']);
  assert.deepEqual(ids(toggleOne(once, 'a')), []);
});

test('toggling never mutates the set it was given', () => {
  const before = new Set(['a']);
  toggleOne(before, 'b');
  assert.deepEqual(ids(before), ['a']);
});

test('a shift-click range selects everything between anchor and target, either way round', () => {
  const visible = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(ids(selectRange(new Set(), visible, 'b', 'd', true)), [
    'b',
    'c',
    'd',
  ]);
  assert.deepEqual(ids(selectRange(new Set(), visible, 'd', 'b', true)), [
    'b',
    'c',
    'd',
  ]);
});

test('a shift-click range can also clear, keeping what lies outside it', () => {
  const visible = ['a', 'b', 'c', 'd'];
  const all = new Set(visible);
  assert.deepEqual(ids(selectRange(all, visible, 'b', 'c', false)), ['a', 'd']);
});

test('a range whose anchor is no longer on screen is just the target', () => {
  const visible = ['a', 'b', 'c'];
  assert.deepEqual(ids(selectRange(new Set(), visible, 'zzz', 'c', true)), [
    'c',
  ]);
});

test('the header reads all, some or none of the rows on screen', () => {
  const visible = ['a', 'b'];
  assert.equal(headerState(new Set(), visible), 'none');
  assert.equal(headerState(new Set(['a']), visible), 'some');
  assert.equal(headerState(new Set(['a', 'b', 'x']), visible), 'all');
  assert.equal(headerState(new Set(['x']), visible), 'none');
  assert.equal(headerState(new Set(['x']), []), 'none');
});

test('the header checkbox selects every matching row, keeping hidden selections', () => {
  const next = toggleAllVisible(new Set(['x', 'a']), ['a', 'b', 'c']);
  assert.deepEqual(ids(next), ['a', 'b', 'c', 'x']);
});

test('with every matching row selected, the header checkbox clears only those rows', () => {
  const next = toggleAllVisible(new Set(['x', 'a', 'b']), ['a', 'b']);
  assert.deepEqual(ids(next), ['x']);
});

test('hidden count is the selected records the current filter does not show', () => {
  assert.equal(hiddenCount(new Set(['a', 'x', 'y']), ['a', 'b']), 2);
  assert.equal(hiddenCount(new Set(), ['a']), 0);
});

test('records that no longer exist drop out of the selection', () => {
  const selected = new Set(['a', 'gone']);
  assert.deepEqual(ids(pruneSelection(selected, ['a', 'b'])), ['a']);
});

test('pruning a selection with nothing missing keeps the same set', () => {
  const selected = new Set(['a']);
  assert.equal(pruneSelection(selected, ['a', 'b']), selected);
});
