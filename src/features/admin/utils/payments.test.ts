import assert from 'node:assert/strict';
import { test } from 'node:test';
import { israelMonthStart, tallyPayments } from './payments';

test('the month starts at Israel midnight, not UTC midnight', () => {
  // 1 Oct 2026 is summer time (UTC+3), so local midnight is 21:00 the day before.
  assert.equal(israelMonthStart(new Date('2026-10-13T09:00:00Z')), '2026-09-30T21:00:00.000Z');
  // 23:30 UTC on 31 Oct is already 1 Nov in Israel (UTC+2 by then).
  assert.equal(israelMonthStart(new Date('2026-10-31T23:30:00Z')), '2026-10-31T22:00:00.000Z');
});

test('counts every payment but each Owner once', () => {
  const monthStart = '2026-09-30T21:00:00.000Z';
  const tally = tallyPayments(
    [
      { ownerId: 'a', occurredAt: '2026-08-02T10:00:00Z' },
      { ownerId: 'a', occurredAt: '2026-10-05T10:00:00Z' },
      { ownerId: 'b', occurredAt: '2026-10-06T10:00:00Z' },
      { ownerId: 'b', occurredAt: '2026-10-07T10:00:00Z' },
      { ownerId: 'c', occurredAt: '2026-09-30T20:59:00Z' },
    ],
    monthStart,
  );

  assert.deepEqual(tally, {
    paidUsers: 3,
    paidUsersThisMonth: 2,
    payments: 5,
    paymentsThisMonth: 3,
  });
});

test('no payments is all zeros', () => {
  assert.deepEqual(tallyPayments([], '2026-09-30T21:00:00.000Z'), {
    paidUsers: 0,
    paidUsersThisMonth: 0,
    payments: 0,
    paymentsThisMonth: 0,
  });
});
