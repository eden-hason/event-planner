import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  expenseFilterCount,
  matchesExpenseFilter,
  summarizeExpenses,
  type ExpenseSummaryRow,
} from './expense-summary';

function row(name: string, estimate: number, paid: Partial<ExpenseSummaryRow> = {}): ExpenseSummaryRow {
  return {
    name,
    estimate,
    fullyPaid: false,
    hasAdvance: false,
    advanceAmount: 0,
    advancePaid: false,
    ...paid,
  };
}

test('no expenses summarize to zeros', () => {
  const summary = summarizeExpenses([], 80000);
  assert.equal(summary.count, 0);
  assert.equal(summary.total, 0);
  assert.equal(summary.budgetPercent, 0);
  assert.equal(summary.remaining, 80000);
  assert.equal(summary.level, 'ok');
  assert.deepEqual(summary.segments, []);
});

test('paid counts fully paid expenses and paid advances, owed is the rest', () => {
  const summary = summarizeExpenses(
    [
      row('Venue', 45000, { fullyPaid: true }),
      row('Photographer', 9500, { hasAdvance: true, advanceAmount: 2000, advancePaid: true }),
      row('DJ', 6000, { hasAdvance: true, advanceAmount: 1000, advancePaid: false }),
    ],
    null,
  );

  assert.equal(summary.total, 60500);
  assert.equal(summary.paid, 47000);
  assert.equal(summary.owed, 13500);
  assert.equal(summary.paidCount, 1);
  assert.equal(summary.owedCount, 2);
});

test('a paid advance never counts for more than the expense', () => {
  const summary = summarizeExpenses(
    [row('Cake', 500, { hasAdvance: true, advanceAmount: 800, advancePaid: true })],
    null,
  );
  assert.equal(summary.paid, 500);
  assert.equal(summary.owed, 0);
});

test('without a budget there is no remaining and no warning', () => {
  const summary = summarizeExpenses([row('Venue', 45000)], null);
  assert.equal(summary.budget, null);
  assert.equal(summary.remaining, null);
  assert.equal(summary.budgetPercent, 0);
  assert.equal(summary.level, 'ok');
});

test('the level turns amber past 85% and red past the budget', () => {
  assert.equal(summarizeExpenses([row('Venue', 85000)], 100000).level, 'ok');
  assert.equal(summarizeExpenses([row('Venue', 86000)], 100000).level, 'warn');
  assert.equal(summarizeExpenses([row('Venue', 100000)], 100000).level, 'warn');

  const over = summarizeExpenses([row('Venue', 108000)], 100000);
  assert.equal(over.level, 'over');
  assert.equal(over.budgetPercent, 108);
  assert.equal(over.remaining, -8000);
});

test('same-named expenses merge and segments run largest first', () => {
  const summary = summarizeExpenses(
    [row('DJ', 6000), row('Venue', 45000), row('Photographer', 9500), row('Photographer', 1200)],
    null,
  );

  assert.deepEqual(
    summary.segments.map((s) => [s.name, s.amount, s.count]),
    [
      ['Venue', 45000, 1],
      ['Photographer', 10700, 2],
      ['DJ', 6000, 1],
    ],
  );
  assert.equal(summary.segments[0].percent, 73);
});

test('zero-priced expenses get no segment', () => {
  const summary = summarizeExpenses([row('Venue', 45000), row('Favors', 0)], null);
  assert.deepEqual(summary.segments.map((s) => s.name), ['Venue']);
  assert.equal(summary.count, 2);
});

test('past five expenses the rest fold into one other segment', () => {
  const rows = [10, 9, 8, 7, 6, 5, 4, 3].map((n) => row(`E${n}`, n * 1000));
  const summary = summarizeExpenses(rows, null);

  assert.equal(summary.segments.length, 6);
  assert.deepEqual(summary.segments.slice(0, 5).map((s) => s.name), ['E10', 'E9', 'E8', 'E7', 'E6']);
  const other = summary.segments[5];
  assert.equal(other.isOther, true);
  assert.equal(other.amount, 12000);
  assert.equal(other.count, 3);
  assert.equal(other.percent, 23);
});

test('a single leftover keeps its own segment instead of folding', () => {
  const rows = [6, 5, 4, 3, 2, 1].map((n) => row(`E${n}`, n * 1000));
  const summary = summarizeExpenses(rows, null);
  assert.equal(summary.segments.length, 6);
  assert.equal(summary.segments.some((s) => s.isOther), false);
});

test('owed and paid split on the fully-paid flag, a paid advance stays owed', () => {
  const paid = row('Venue', 45000, { fullyPaid: true });
  const advance = row('DJ', 6000, { hasAdvance: true, advanceAmount: 1000, advancePaid: true });
  const unpaid = row('Cake', 900);

  assert.equal(matchesExpenseFilter(paid, 'all'), true);
  assert.equal(matchesExpenseFilter(paid, 'paid'), true);
  assert.equal(matchesExpenseFilter(paid, 'owed'), false);
  assert.equal(matchesExpenseFilter(advance, 'owed'), true);
  assert.equal(matchesExpenseFilter(advance, 'paid'), false);
  assert.equal(matchesExpenseFilter(unpaid, 'owed'), true);

  const summary = summarizeExpenses([paid, advance, unpaid], null);
  assert.equal(expenseFilterCount(summary, 'all'), 3);
  assert.equal(expenseFilterCount(summary, 'owed'), 2);
  assert.equal(expenseFilterCount(summary, 'paid'), 1);
});

test('a status narrows on top of the chip', () => {
  const due = row('DJ', 6000, { hasAdvance: true, advanceAmount: 1000, advancePaid: false });
  const unpaid = row('Cake', 900);

  assert.equal(matchesExpenseFilter(due, 'all', 'advance-due'), true);
  assert.equal(matchesExpenseFilter(unpaid, 'all', 'advance-due'), false);
  assert.equal(matchesExpenseFilter(unpaid, 'owed', 'not-paid'), true);
  assert.equal(matchesExpenseFilter(unpaid, 'paid', 'not-paid'), false);
});
