import { test } from 'node:test';
import assert from 'node:assert/strict';
import { otherSignInMethod, parseSignInMethod, signInMethodOf } from './sign-in-method';

test('only a known method is read back from the cookie', () => {
  assert.equal(parseSignInMethod('phone'), 'phone');
  assert.equal(parseSignInMethod('google'), 'google');
  assert.equal(parseSignInMethod('email'), undefined);
  assert.equal(parseSignInMethod(''), undefined);
  assert.equal(parseSignInMethod(null), undefined);
  assert.equal(parseSignInMethod(undefined), undefined);
});

test('the other method is the one not used', () => {
  assert.equal(otherSignInMethod('phone'), 'google');
  assert.equal(otherSignInMethod('google'), 'phone');
});

test('a phone account signs in by phone', () => {
  assert.equal(
    signInMethodOf({ phone: '972501234567', identities: [{ provider: 'phone' }] }),
    'phone',
  );
  // A Visitor saved with their phone may carry no phone identity, only the number.
  assert.equal(signInMethodOf({ phone: '972501234567', identities: [] }), 'phone');
});

test('a Google account signs in with Google', () => {
  assert.equal(signInMethodOf({ phone: '', identities: [{ provider: 'google' }] }), 'google');
  assert.equal(signInMethodOf({ identities: [{ provider: 'google' }] }), 'google');
});

test('an account with both methods, or neither, has no single method', () => {
  assert.equal(
    signInMethodOf({ phone: '972501234567', identities: [{ provider: 'google' }] }),
    undefined,
  );
  assert.equal(signInMethodOf({ phone: '', identities: [] }), undefined);
  assert.equal(signInMethodOf(null), undefined);
});
