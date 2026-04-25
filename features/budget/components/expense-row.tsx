'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from '@/components/ui/item';
import { type ExpenseApp } from '../schemas/expenses';
import { formatCurrency, getExpenseStatus, remainingAmount } from '../types';

interface ExpenseRowProps {
  expense: ExpenseApp;
  onClick: (expense: ExpenseApp) => void;
}

export function ExpenseRow({ expense, onClick }: ExpenseRowProps) {
  const t = useTranslations('budget');
  const status = getExpenseStatus(expense);
  const remaining = remainingAmount(expense);

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
        <ItemDescription className="mt-0.5 flex items-center gap-2 text-xs line-clamp-none">
          <span>{expense.vendorName || t('expenseRow.noVendor')}</span>
          {expense.hasAdvance && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[11px] font-medium',
                expense.advancePaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
              )}
            >
              {expense.advancePaid ? t('expenseRow.advancePaidBadge') : t('expenseRow.advanceDueBadge')} · {formatCurrency(expense.advanceAmount)}
            </span>
          )}
        </ItemDescription>
      </ItemContent>

      <ItemActions>
        <div className="mr-2 text-right">
          <p className="text-sm font-semibold">{formatCurrency(expense.estimate)}</p>
          {remaining > 0 && (
            <p className="mt-0.5 text-[11px] text-amber-600">
              {t('expenseRow.left', { amount: formatCurrency(remaining) })}
            </p>
          )}
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap', STATUS_STYLES[status])}>
          {STATUS_LABELS[status]}
        </span>
      </ItemActions>
    </Item>
  );
}
