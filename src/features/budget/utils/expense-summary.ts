import { getExpenseStatus, type ExpenseStatus } from '../types';

/** The fields the Expenses hero reads from an expense. */
export interface ExpenseSummaryRow {
  name: string;
  emoji: string;
  estimate: number;
  fullyPaid: boolean;
  hasAdvance: boolean;
  advanceAmount: number;
  advancePaid: boolean;
}

/** How many expenses get a segment of their own before the rest fold into one. */
export const EXPENSE_SEGMENT_LIMIT = 5;

export interface ExpenseSegment {
  /** The expense name, or a reserved key for the folded remainder. */
  key: string;
  name: string;
  emoji: string;
  amount: number;
  /** Expenses in the segment: same-named ones merge, and `other` holds the rest. */
  count: number;
  /** Share of the total, rounded. */
  percent: number;
  isOther: boolean;
}

/** Below `over`, how close spending is to the budget. */
export type BudgetLevel = 'ok' | 'warn' | 'over';

/** Past this share of the budget the hero turns amber. */
const WARN_RATIO = 0.85;

export interface ExpenseSummary {
  count: number;
  total: number;
  /** Money already out: fully paid expenses, plus paid advances on the rest. */
  paid: number;
  owed: number;
  /** Fully paid expenses. A paid advance alone does not count. */
  paidCount: number;
  owedCount: number;
  budget: number | null;
  /** Spent out of budget, unclamped so an overrun reads 108%. 0 without a budget. */
  budgetPercent: number;
  /** Positive while under budget, negative once over. Null without a budget. */
  remaining: number | null;
  level: BudgetLevel;
  /** Largest first, with the folded `other` segment last. */
  segments: ExpenseSegment[];
}

function paidAmount(row: ExpenseSummaryRow): number {
  const estimate = Number(row.estimate);
  if (row.fullyPaid) return estimate;
  if (row.hasAdvance && row.advancePaid) return Math.min(Number(row.advanceAmount), estimate);
  return 0;
}

export function summarizeExpenses(
  rows: ExpenseSummaryRow[],
  budget: number | null,
): ExpenseSummary {
  const buckets = new Map<string, { name: string; emoji: string; amount: number; count: number }>();
  let total = 0;
  let paid = 0;
  let paidCount = 0;

  for (const row of rows) {
    const estimate = Number(row.estimate);
    total += estimate;
    paid += paidAmount(row);
    if (row.fullyPaid) paidCount += 1;

    const key = row.name.trim();
    const bucket = buckets.get(key) ?? { name: key, emoji: row.emoji, amount: 0, count: 0 };
    bucket.amount += estimate;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const percentOf = (amount: number) => (total > 0 ? Math.round((amount / total) * 100) : 0);

  const ranked = [...buckets.entries()]
    .filter(([, bucket]) => bucket.amount > 0)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .map(([key, bucket]): ExpenseSegment => ({
      key,
      ...bucket,
      percent: percentOf(bucket.amount),
      isOther: false,
    }));

  // Folding a single leftover would trade its name for "other" and save no room.
  const segments =
    ranked.length <= EXPENSE_SEGMENT_LIMIT + 1
      ? ranked
      : [...ranked.slice(0, EXPENSE_SEGMENT_LIMIT), foldOther(ranked.slice(EXPENSE_SEGMENT_LIMIT), percentOf)];

  const hasBudget = budget !== null && budget > 0;
  const ratio = hasBudget ? total / budget : 0;

  return {
    count: rows.length,
    total,
    paid,
    owed: total - paid,
    paidCount,
    owedCount: rows.length - paidCount,
    budget: hasBudget ? budget : null,
    budgetPercent: Math.round(ratio * 100),
    remaining: hasBudget ? budget - total : null,
    level: !hasBudget ? 'ok' : total > budget ? 'over' : ratio > WARN_RATIO ? 'warn' : 'ok',
    segments,
  };
}

function foldOther(rest: ExpenseSegment[], percentOf: (amount: number) => number): ExpenseSegment {
  const amount = rest.reduce((sum, segment) => sum + segment.amount, 0);
  return {
    // Names are trimmed, so a leading space can never collide with one.
    key: ' other',
    name: '',
    emoji: '',
    amount,
    count: rest.reduce((sum, segment) => sum + segment.count, 0),
    percent: percentOf(amount),
    isOther: true,
  };
}

/** The chips over the list: everything, what is still owed, what is paid in full. */
export type ExpenseFilter = 'all' | 'owed' | 'paid';

export const EXPENSE_FILTERS: ExpenseFilter[] = ['all', 'owed', 'paid'];

export const EXPENSE_STATUSES: ExpenseStatus[] = [
  'not-paid',
  'advance-due',
  'advance-paid',
  'fully-paid',
];

/** The count each chip shows, matching the hero's paid / still-owed tiles. */
export function expenseFilterCount(summary: ExpenseSummary, filter: ExpenseFilter): number {
  if (filter === 'owed') return summary.owedCount;
  if (filter === 'paid') return summary.paidCount;
  return summary.count;
}

/** `status` narrows to one payment status on top of `filter`; null keeps them all. */
export function matchesExpenseFilter(
  row: ExpenseSummaryRow,
  filter: ExpenseFilter,
  status: ExpenseStatus | null = null,
): boolean {
  if (filter === 'owed' && row.fullyPaid) return false;
  if (filter === 'paid' && !row.fullyPaid) return false;
  if (status && getExpenseStatus(row) !== status) return false;
  return true;
}
