'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ExpenseApp } from '../schemas/expenses';
import { paidAmount, formatCurrency, getExpenseStatus } from '../types';
import { ExpenseRow } from './expense-row';
import { ExpenseSheet } from './expense-sheet';

interface ExpensesTabProps {
  expenses: ExpenseApp[];
  eventId: string;
  onAddExpense: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  'fully-paid':   '#22c55e',
  'advance-paid': '#f59e0b',
  'advance-due':  '#ef4444',
  'not-paid':     '#e5e7eb',
};

const STATUS_LABEL_KEYS = {
  'fully-paid':   'expenseRow.statusFullyPaid',
  'advance-paid': 'expenseRow.statusAdvancePaid',
  'advance-due':  'expenseRow.statusAdvanceDue',
  'not-paid':     'expenseRow.statusNotPaid',
} as const;

function InsightsPanel({ expenses, t }: { expenses: ExpenseApp[]; t: ReturnType<typeof useTranslations<'budget'>> }) {
  const totalBudget = expenses.reduce((s, e) => s + Number(e.estimate), 0);
  const totalPaid   = expenses.reduce((s, e) => s + paidAmount(e), 0);
  const remaining   = totalBudget - totalPaid;
  const pct         = totalBudget > 0 ? Math.round((totalPaid / totalBudget) * 100) : 0;

  const statusGroups = expenses.reduce<Record<string, { count: number; amount: number }>>(
    (acc, exp) => {
      const s = getExpenseStatus(exp);
      acc[s] = acc[s] ?? { count: 0, amount: 0 };
      acc[s].count++;
      acc[s].amount += Number(exp.estimate);
      return acc;
    },
    {},
  );

  const pieData = (
    ['fully-paid', 'advance-paid', 'advance-due', 'not-paid'] as const
  )
    .map((key) => ({
      key,
      label: t(STATUS_LABEL_KEYS[key]),
      value: statusGroups[key]?.amount ?? 0,
      count: statusGroups[key]?.count ?? 0,
      color: STATUS_COLORS[key],
    }))
    .filter((d) => d.value > 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Budget overview */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">{t('stats.totalBudget')}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{formatCurrency(totalBudget)}</p>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{pct}% {t('stats.paid')}</span>
          <span>{t('stats.remaining', { amount: formatCurrency(remaining) })}</span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <div>
            <p className="text-xs text-muted-foreground">{t('stats.paidSoFar')}</p>
            <p className="mt-0.5 text-sm font-semibold text-primary">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t('stats.leftToPay')}</p>
            <p className="mt-0.5 text-sm font-semibold">{formatCurrency(remaining)}</p>
          </div>
        </div>
      </div>

      {/* Status breakdown donut */}
      {pieData.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="mb-3 text-xs font-medium text-muted-foreground">{t('stats.statusBreakdown')}</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={64}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-1 space-y-1.5">
            {pieData.map((d) => (
              <li key={d.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-muted-foreground">{d.label}</span>
                </span>
                <span className="font-medium">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ExpensesTab({ expenses, eventId, onAddExpense }: ExpensesTabProps) {
  const t = useTranslations('budget');
  const [editExpense, setEditExpense] = useState<ExpenseApp | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handleRowClick = (expense: ExpenseApp) => {
    setEditExpense(expense);
    setSheetOpen(true);
  };

  const handleSheetClose = (open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditExpense(null);
  };

  const filteredExpenses = search.trim()
    ? expenses.filter((exp) => {
        const q = search.toLowerCase();
        return (
          exp.name.toLowerCase().includes(q) ||
          (exp.vendorName ?? '').toLowerCase().includes(q)
        );
      })
    : expenses;

  if (expenses.length === 0) {
    return (
      <>
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col items-center py-16 text-center">
            <img src="/hero-coins.svg" alt="" aria-hidden="true" className="h-64 w-64" />
            <p className="font-semibold text-foreground">{t('expenseEmpty.title')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('expenseEmpty.description')}</p>
            <Button className="mt-4" onClick={onAddExpense}>
              {t('expenseEmpty.cta')}
            </Button>
          </div>
        </div>
        <ExpenseSheet
          open={sheetOpen}
          onOpenChange={handleSheetClose}
          expense={editExpense}
          eventId={eventId}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Insights sidebar — secondary, sticky on desktop */}
        <div className="order-2 lg:order-1 lg:col-span-1 lg:self-start lg:sticky lg:top-4">
          <InsightsPanel expenses={expenses} t={t} />
        </div>

        {/* Expenses list — primary content */}
        <div className="order-1 lg:order-2 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="ps-9"
                  placeholder={t('expenseSearchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp) => (
                  <ExpenseRow key={exp.id} expense={exp} onClick={handleRowClick} />
                ))
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {t('expenseSearchEmpty')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ExpenseSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        expense={editExpense}
        eventId={eventId}
      />
    </>
  );
}
