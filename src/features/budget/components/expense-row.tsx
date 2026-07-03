'use client';

import { useTranslations } from 'next-intl';
import { Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemActions } from '@/components/ui/item';
import { type ExpenseApp } from '../schemas/expenses';
import { formatCurrency, getExpenseStatus } from '../types';

interface ExpenseRowProps {
  expense: ExpenseApp;
  onClick: (expense: ExpenseApp) => void;
}

export function ExpenseRow({ expense, onClick }: ExpenseRowProps) {
  const t = useTranslations('budget');
  const status = getExpenseStatus(expense);

  const STATUS_STYLES: Record<string, string> = {
    'fully-paid':   'bg-green-100 text-green-700',
    'advance-paid': 'bg-amber-100 text-amber-700',
    'advance-due':  'bg-red-100 text-red-700',
    'not-paid':     'bg-muted text-muted-foreground',
  };

  const STATUS_LABELS: Record<string, string> = {
    'fully-paid':   t('expenseRow.statusFullyPaid'),
    'advance-paid': t('expenseRow.statusAdvancePaid'),
    'advance-due':  t('expenseRow.statusAdvanceDue'),
    'not-paid':     t('expenseRow.statusNotPaid'),
  };

  return (
    <Item
      onClick={() => onClick(expense)}
      className="cursor-pointer rounded-none px-4 py-3.5 gap-3 hover:bg-muted/40 border-b-border last:border-b-0"
    >
      <ItemMedia className="size-10 self-center translate-y-0 rounded-xl bg-muted text-muted-foreground text-xl">
        {expense.emoji}
      </ItemMedia>

      <ItemContent>
        <ItemTitle className="w-full truncate">{expense.name}</ItemTitle>
        <div className="mt-0.5 flex items-center gap-2">
          {expense.vendorName ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Store className="h-3 w-3 shrink-0" />
              {expense.vendorName}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground/60">{t('expenseRow.noVendor')}</span>
          )}
          {expense.hasAdvance && (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                expense.advancePaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
              )}
            >
              {expense.advancePaid ? t('expenseRow.advancePaidBadge') : t('expenseRow.advanceDueBadge')} · {formatCurrency(expense.advanceAmount)}
            </span>
          )}
        </div>
      </ItemContent>

      <ItemActions>
        <div className="flex flex-col items-center text-center">
          <p className="text-sm font-semibold">{formatCurrency(expense.estimate)}</p>

          <span className={cn('mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap', STATUS_STYLES[status])}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </ItemActions>
    </Item>
  );
}
