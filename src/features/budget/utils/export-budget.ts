/**
 * Client-side spreadsheet export for the Gifts and Expenses tabs.
 *
 * The row builders are pure so they can be tested without a browser; only
 * `downloadSheet` touches `xlsx` and the DOM. Amounts stay numbers (not
 * formatted "₪1,000" strings) so the Owner can sum and sort them in Excel.
 */

import type { ExpenseApp } from '../schemas/expenses';
import type { ExpenseStatus } from '../types';
import { getExpenseStatus } from '../types';

export type SheetCell = string | number;
export type SheetRow = SheetCell[];

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

/** Strips characters that are not allowed in file names on Windows or macOS. */
export function toFileName(...parts: (string | null | undefined)[]): string {
  return parts
    .map((part) => part?.replace(/[\\/:*?"<>|]/g, '').trim())
    .filter(Boolean)
    .join(' - ');
}

interface DownloadSheetOptions {
  fileName: string;
  sheetName: string;
  rtl?: boolean;
}

export async function downloadSheet(
  rows: SheetRow[],
  { fileName, sheetName, rtl = false }: DownloadSheetOptions,
): Promise<void> {
  const { utils, writeFile } = await import('xlsx');

  const ws = utils.aoa_to_sheet(rows);
  // Size each column to its longest value so nothing opens truncated
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i] ?? 10, String(cell).length + 2);
    });
  }
  ws['!cols'] = widths.map((wch) => ({ wch: Math.min(wch, 60) }));

  const wb = utils.book_new();
  // Excel sheet names are capped at 31 characters
  utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  if (rtl) wb.Workbook = { Views: [{ RTL: true }] };

  writeFile(wb, `${fileName}.xlsx`);
}
