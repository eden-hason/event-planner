import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { callPaneState } from './pane-state.ts';

test('each timeline status maps to its own face', () => {
  assert.equal(callPaneState('locked'), 'locked');
  assert.equal(callPaneState('cancelled'), 'off');
  assert.equal(callPaneState('in_progress'), 'live');
  assert.equal(callPaneState('completed'), 'done');
  assert.equal(callPaneState('pending'), 'planned');
});

test('a status this does not know reads as planned, never as a started round', () => {
  assert.equal(callPaneState('sent'), 'planned');
  assert.equal(callPaneState('expired'), 'planned');
});
