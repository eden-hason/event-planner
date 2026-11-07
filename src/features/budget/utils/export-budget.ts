/**
 * Client-side spreadsheet export for the Gifts and Expenses tabs.
 *
 * The row builders are pure so they can be tested without a browser; the
 * download itself is `downloadSheet` in `@/lib/sheet`. Amounts stay numbers (not
 * formatted "₪1,000" strings) so the Owner can sum and sort them in Excel.
 */

import type { SheetRow } from '@/lib/sheet';

import type { ExpenseApp } from '../schemas/expenses';
import type { ExpenseStatus } from '../types';
import { getExpenseStatus } from '../types';

export interface GiftExportRow {
  guestName: string;
  amount: number | '' | null;
  paymentMethod: string | null;
  notes: string | null;
}

export interface GiftSheetLabels {
  headers: [guestName: string, amount: string, paymentMethod: string, notes: string];
  total: string;
  paymentMethod: (key: string) => string;
}

export function buildGiftsSheetRows(
  gifts: GiftExportRow[],
  labels: GiftSheetLabels,
): SheetRow[] {
  let total = 0;
  const rows = gifts.map((gift) => {
    const amount = gift.amount === '' || gift.amount === null ? '' : Number(gift.amount);
    if (amount !== '') total += amount;
    return [
      gift.guestName,
      amount,
      gift.paymentMethod ? labels.paymentMethod(gift.paymentMethod) : '',
      gift.notes ?? '',
    ];
  });

  return [labels.headers, ...rows, [], [labels.total, total, '', '']];
}

export interface ExpenseSheetLabels {
  headers: [
    name: string,
    vendor: string,
    phone: string,
    price: string,
    advance: string,
    status: string,
  ];
  total: string;
  status: (status: ExpenseStatus) => string;
}

export function buildExpensesSheetRows(
  expenses: ExpenseApp[],
  labels: ExpenseSheetLabels,
): SheetRow[] {
  let total = 0;
  const rows = expenses.map((expense) => {
    const price = Number(expense.estimate);
    total += price;
    return [
      expense.name,
      expense.vendorName ?? '',
      expense.vendorPhone ?? '',
      price,
      expense.hasAdvance ? Number(expense.advanceAmount) : '',
      labels.status(getExpenseStatus(expense)),
    ];
  });

  return [labels.headers, ...rows, [], [labels.total, '', '', total, '', '']];
}
