import assert from 'node:assert/strict';
import { test } from 'node:test';
import { responseRate } from './response-rate';

test('counts declined answers alongside confirmed ones', () => {
  assert.equal(responseRate({ total: 100, confirmed: 60, declined: 20 }), 0.8);
});

test('is zero when nobody has answered yet', () => {
  assert.equal(responseRate({ total: 40, confirmed: 0, declined: 0 }), 0);
});

test('is one when every guest has answered', () => {
  assert.equal(responseRate({ total: 50, confirmed: 30, declined: 20 }), 1);
  assert.equal(responseRate({ total: 12, confirmed: 0, declined: 12 }), 1);
});

test('has no rate without a guest list', () => {
  assert.equal(responseRate({ total: 0, confirmed: 0, declined: 0 }), null);
});
