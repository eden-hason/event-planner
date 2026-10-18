import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { initialsFor, UNNAMED_USER, userDisplayName } from './avatar.ts';

test('initials come from the name, then the email', () => {
  assert.equal(initialsFor('Dana Levi', 'dana@example.com'), 'DL');
  assert.equal(initialsFor('דנה לוי', null), 'דל');
  assert.equal(initialsFor('Dana', null), 'DA');
  assert.equal(initialsFor(null, 'dana@example.com'), 'DA');
});

test('a phone sign-in with no name and no email gets a placeholder, not a crash', () => {
  assert.equal(initialsFor(null, null), '?');
});

test('the display name falls back from name to email to phone to a placeholder', () => {
  assert.equal(userDisplayName({ fullName: 'Dana Levi', email: 'dana@example.com', phone: null }), 'Dana Levi');
  assert.equal(userDisplayName({ fullName: null, email: 'dana@example.com', phone: '+972501234567' }), 'dana@example.com');
  assert.match(userDisplayName({ fullName: null, email: null, phone: '+972501234567' }).replace(/\D/g, ''), /501234567$/);
  assert.equal(userDisplayName({ fullName: null, email: null, phone: null }), UNNAMED_USER);
});
