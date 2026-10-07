import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyUpgradeError, isSaveRequired, isVisitor, safeReturnPath, SAVE_REQUIRED } from './visitor';

test('a Visitor is an anonymous user, nobody else is', () => {
  assert.equal(isVisitor({ is_anonymous: true }), true);
  assert.equal(isVisitor({ is_anonymous: false }), false);
  assert.equal(isVisitor({}), false);
  assert.equal(isVisitor(null), false);
  assert.equal(isVisitor(undefined), false);
});

test('an identity that already exists means an existing account', () => {
  assert.equal(classifyUpgradeError('phone_exists'), 'existing-account');
  assert.equal(classifyUpgradeError('email_exists'), 'existing-account');
  assert.equal(classifyUpgradeError('identity_already_exists'), 'existing-account');
});

test('anything else is a failure, never a reason to discard the Event', () => {
  assert.equal(classifyUpgradeError('otp_expired'), 'failed');
  assert.equal(classifyUpgradeError('manual_linking_disabled'), 'failed');
  assert.equal(classifyUpgradeError(''), 'failed');
  assert.equal(classifyUpgradeError(null), 'failed');
  assert.equal(classifyUpgradeError(undefined), 'failed');
});

test('a save-required refusal is recognised, other failures are not', () => {
  assert.equal(isSaveRequired({ message: SAVE_REQUIRED }), true);
  assert.equal(isSaveRequired({ message: 'Failed to send' }), false);
  assert.equal(isSaveRequired(null), false);
});

test('the save dialog only ever returns to a path on this site', () => {
  assert.equal(safeReturnPath('/app/abc/guests'), '/app/abc/guests');
  assert.equal(safeReturnPath('https://evil.example'), '/app');
  assert.equal(safeReturnPath('//evil.example'), '/app');
  assert.equal(safeReturnPath(null), '/app');
  assert.equal(safeReturnPath('', '/start'), '/start');
});
