import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isExistingAccountError,
  isVisitor,
  parseSaveReason,
  safeReturnPath,
  savePageHref,
} from './visitor';

test('a Visitor is an anonymous user, nobody else is', () => {
  assert.equal(isVisitor({ is_anonymous: true }), true);
  assert.equal(isVisitor({ is_anonymous: false }), false);
  assert.equal(isVisitor({}), false);
  assert.equal(isVisitor(null), false);
  assert.equal(isVisitor(undefined), false);
});

test('an identity that already exists means an existing account', () => {
  assert.equal(isExistingAccountError('phone_exists'), true);
  assert.equal(isExistingAccountError('email_exists'), true);
  assert.equal(isExistingAccountError('identity_already_exists'), true);
});

test('anything else is a failure, never a reason to discard the Event', () => {
  assert.equal(isExistingAccountError('otp_expired'), false);
  assert.equal(isExistingAccountError('manual_linking_disabled'), false);
  assert.equal(isExistingAccountError(''), false);
  assert.equal(isExistingAccountError(null), false);
  assert.equal(isExistingAccountError(undefined), false);
});

test('the save page only ever returns to a path on this site', () => {
  assert.equal(safeReturnPath('/app/abc/guests'), '/app/abc/guests');
  assert.equal(safeReturnPath('https://evil.example'), '/app');
  assert.equal(safeReturnPath('//evil.example'), '/app');
  assert.equal(safeReturnPath(null), '/app');
  assert.equal(safeReturnPath('', '/start'), '/start');
});

test('the save page remembers where it was opened from, and why', () => {
  assert.equal(
    savePageHref('/app/abc/guests?tab=groups', { reason: 'invite' }),
    '/save?from=%2Fapp%2Fabc%2Fguests%3Ftab%3Dgroups&reason=invite',
  );
  assert.equal(savePageHref('/app/abc/home'), '/save?from=%2Fapp%2Fabc%2Fhome');
  assert.equal(
    savePageHref('/app/abc/home', { googleExists: true }),
    '/save?from=%2Fapp%2Fabc%2Fhome&exists=1',
  );
});

test('the save page never carries a way off the site', () => {
  assert.equal(savePageHref('https://evil.example'), '/save?from=%2Fapp');
});

test('only a known reason is a reason', () => {
  assert.equal(parseSaveReason('pay'), 'pay');
  assert.equal(parseSaveReason('delete'), undefined);
  assert.equal(parseSaveReason(null), undefined);
});
