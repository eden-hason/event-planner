import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giftAmount, matchesGiftFilter, summarizeGifts } from './gift-summary';

test('an empty log summarizes to zeros', () => {
  const summary = summarizeGifts([]);
  assert.equal(summary.rowCount, 0);
  assert.equal(summary.total, 0);
  assert.equal(summary.average, 0);
  assert.equal(summary.progressPercent, 0);
  assert.equal(summary.isComplete, false);
  assert.deepEqual(summary.segments, []);
});

test('only positive amounts count as logged', () => {
  assert.equal(giftAmount({ amount: '', paymentMethod: 'bit' }), null);
  assert.equal(giftAmount({ amount: null, paymentMethod: null }), null);
  assert.equal(giftAmount({ amount: 0, paymentMethod: 'cash' }), null);
  assert.equal(giftAmount({ amount: 500, paymentMethod: null }), 500);
});

test('a partly logged list totals, averages and splits by method', () => {
  const summary = summarizeGifts([
    { amount: 1000, paymentMethod: 'bit' },
    { amount: 500, paymentMethod: 'bit' },
    { amount: 3000, paymentMethod: 'check' },
    { amount: 500, paymentMethod: null },
    { amount: '', paymentMethod: null },
    { amount: '', paymentMethod: 'cash' },
  ]);

  assert.equal(summary.rowCount, 6);
  assert.equal(summary.loggedCount, 4);
  assert.equal(summary.missingAmountCount, 2);
  assert.equal(summary.missingMethodCount, 1);
  assert.equal(summary.total, 5000);
  assert.equal(summary.average, 1250);
  assert.equal(summary.largest, 3000);
  assert.equal(summary.progressPercent, 66);
  assert.equal(summary.isComplete, false);
  assert.deepEqual(summary.segments, [
    { key: 'check', amount: 3000, count: 1, percent: 60 },
    { key: 'bit', amount: 1500, count: 2, percent: 30 },
    { key: 'none', amount: 500, count: 1, percent: 10 },
  ]);
});

test('progress rounds down until the last row is logged', () => {
  const rows = Array.from({ length: 210 }, (_, i) => ({
    amount: i < 209 ? 100 : ('' as const),
    paymentMethod: 'cash',
  }));
  assert.equal(summarizeGifts(rows).progressPercent, 99);
});

test('a list is complete only when every row has an amount and a method', () => {
  const missingMethod = summarizeGifts([
    { amount: 100, paymentMethod: 'cash' },
    { amount: 100, paymentMethod: null },
  ]);
  assert.equal(missingMethod.progressPercent, 100);
  assert.equal(missingMethod.isComplete, false);

  const complete = summarizeGifts([
    { amount: 100, paymentMethod: 'cash' },
    { amount: 100, paymentMethod: 'paybox' },
  ]);
  assert.equal(complete.isComplete, true);
});

test('an unknown payment method is counted under other', () => {
  const summary = summarizeGifts([{ amount: 200, paymentMethod: 'transfer' }]);
  assert.deepEqual(summary.segments, [{ key: 'other', amount: 200, count: 1, percent: 100 }]);
});

test('filters pick rows missing an amount or a method, and narrow by method', () => {
  const noAmount = { amount: '' as const, paymentMethod: 'bit' };
  const noMethod = { amount: 300, paymentMethod: null };
  const bit = { amount: 300, paymentMethod: 'bit' };

  assert.equal(matchesGiftFilter(noAmount, 'noAmount'), true);
  assert.equal(matchesGiftFilter(bit, 'noAmount'), false);
  assert.equal(matchesGiftFilter(noMethod, 'noMethod'), true);
  assert.equal(matchesGiftFilter(noAmount, 'noMethod'), false);
  assert.equal(matchesGiftFilter(bit, 'all', 'bit'), true);
  assert.equal(matchesGiftFilter(noMethod, 'all', 'bit'), false);
});
