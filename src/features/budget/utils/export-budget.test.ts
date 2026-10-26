import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ExpenseApp } from '../schemas/expenses';
import {
  buildExpensesSheetRows,
  buildGiftsSheetRows,
  toFileName,
} from './export-budget';

const giftLabels = {
  headers: ['Guest', 'Amount', 'Method', 'Note'] as [string, string, string, string],
  total: 'Total',
  paymentMethod: (key: string) => key.toUpperCase(),
};

test('gift rows keep amounts numeric and total only the filled ones', () => {
  const rows = buildGiftsSheetRows(
    [
      { guestName: 'Dana', amount: 500, paymentMethod: 'bit', notes: 'Thanks' },
      { guestName: 'Avi', amount: '', paymentMethod: null, notes: null },
      { guestName: 'Noa', amount: 250, paymentMethod: 'cash', notes: '' },
    ],
    giftLabels,
  );

  assert.deepEqual(rows, [
    ['Guest', 'Amount', 'Method', 'Note'],
    ['Dana', 500, 'BIT', 'Thanks'],
    ['Avi', '', '', ''],
    ['Noa', 250, 'CASH', ''],
    [],
    ['Total', 750, '', ''],
  ]);
});

function expense(overrides: Partial<ExpenseApp>): ExpenseApp {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    eventId: '00000000-0000-0000-0000-000000000000',
    name: 'DJ',
    emoji: '🎧',
    vendorName: null,
    vendorPhone: null,
    estimate: 0,
    fullyPaid: false,
    fullyPaidAt: null,
    hasAdvance: false,
    advanceAmount: 0,
    advancePaid: false,
    advancePaidAt: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

test('expense rows carry status, advance only when there is one, and a total', () => {
  const rows = buildExpensesSheetRows(
    [
      expense({ name: 'DJ', vendorName: 'Beats', vendorPhone: '050', estimate: 6000, fullyPaid: true }),
      expense({ name: 'Venue', estimate: 40000, hasAdvance: true, advanceAmount: 10000 }),
    ],
    {
      headers: ['Expense', 'Vendor', 'Phone', 'Price', 'Advance', 'Status'],
      total: 'Total',
      status: (status) =>
        ({
          'fully-paid': 'Paid',
          'advance-paid': 'Advance paid',
          'advance-due': 'Advance due',
          'not-paid': 'Not paid',
        })[status],
    },
  );

  assert.deepEqual(rows, [
    ['Expense', 'Vendor', 'Phone', 'Price', 'Advance', 'Status'],
    ['DJ', 'Beats', '050', 6000, '', 'Paid'],
    ['Venue', '', '', 40000, 10000, 'Advance due'],
    [],
    ['Total', '', '', 46000, '', ''],
  ]);
});

test('file names drop forbidden characters and empty parts', () => {
  assert.equal(toFileName('Dana & Avi: 2027/05', 'Gifts'), 'Dana & Avi 202705 - Gifts');
  assert.equal(toFileName(undefined, 'Expenses'), 'Expenses');
  assert.equal(toFileName('  ', 'Expenses'), 'Expenses');
});
