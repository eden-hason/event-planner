import assert from 'node:assert/strict';
import { test } from 'node:test';
import { israelMonthStart, tallyPayments } from './payments';

test('the month starts at Israel midnight, not UTC midnight', () => {
  // 1 Oct 2026 is summer time (UTC+3), so local midnight is 21:00 the day before.
  assert.equal(israelMonthStart(new Date('2026-10-13T09:00:00Z')), '2026-09-30T21:00:00.000Z');
  // 23:30 UTC on 31 Oct is already 1 Nov in Israel (UTC+2 by then).
  assert.equal(israelMonthStart(new Date('2026-10-31T23:30:00Z')), '2026-10-31T22:00:00.000Z');
});

test('sums every payment but counts each Owner once', () => {
  const monthStart = '2026-09-30T21:00:00.000Z';
  const tally = tallyPayments(
    [
      { ownerId: 'a', amount: 1200, occurredAt: '2026-08-02T10:00:00Z' },
      { ownerId: 'a', amount: 300, occurredAt: '2026-10-05T10:00:00Z' },
      { ownerId: 'b', amount: 999.5, occurredAt: '2026-10-06T10:00:00Z' },
      { ownerId: 'b', amount: 450, occurredAt: '2026-10-07T10:00:00Z' },
      { ownerId: 'c', amount: 800, occurredAt: '2026-09-30T20:59:00Z' },
    ],
    monthStart,
  );

  assert.deepEqual(tally, {
    paidUsers: 3,
    paidUsersThisMonth: 2,
    paymentsTotal: 3749.5,
    paymentsTotalThisMonth: 1749.5,
  });
});

test('no payments is all zeros', () => {
  assert.deepEqual(tallyPayments([], '2026-09-30T21:00:00.000Z'), {
    paidUsers: 0,
    paidUsersThisMonth: 0,
    paymentsTotal: 0,
    paymentsTotalThisMonth: 0,
  });
});
