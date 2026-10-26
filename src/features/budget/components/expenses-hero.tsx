'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconCheck, IconChevronDown, IconClock, IconPencil } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../types';
import type { BudgetLevel, ExpenseSegment, ExpenseSummary } from '../utils/expense-summary';

interface ExpensesHeroProps {
  summary: ExpenseSummary;
  onEditBudget: () => void;
  onAddExpense: () => void;
}

/**
 * The Expenses tab's hero: what has been spent, measured against the budget,
 * split into paid and still owed, and broken down by expense. Everything is
 * derived from the expenses already on the page - no fetch of its own. It
 * stays below `md`, where the breakdown folds behind a show/hide row, so it
 * renders twice and lets the breakpoint pick.
 */
export function ExpensesHero(props: ExpensesHeroProps) {
  return (
    <>
      <DesktopHero {...props} />
      <MobileHero {...props} />
    </>
  );
}

// Fills by rank, then a neutral one for the folded remainder.
const SEGMENT_FILLS = [
  'bg-[#5B47B8] dark:bg-[#A898F0]',
  'bg-[#A8730A] dark:bg-[#E8B54A]',
  'bg-[#1F6F9A] dark:bg-[#6CB6E0]',
  'bg-[#B81C9E] dark:bg-[#F290E0]',
  'bg-[#1E8F55] dark:bg-[#6FD3A0]',
  'bg-[#C23A3F] dark:bg-[#F28A8E]',
];
const OTHER_FILL = 'bg-[#5E5364] dark:bg-[#B5AABB]';

function segmentFill(segment: ExpenseSegment, index: number) {
  return segment.isOther ? OTHER_FILL : SEGMENT_FILLS[index % SEGMENT_FILLS.length];
}

const PROGRESS_FILL: Record<BudgetLevel, string> = {
  ok: 'bg-primary',
  warn: 'bg-warning-solid',
  over: 'bg-destructive',
};

const LEVEL_INK: Record<BudgetLevel, string> = {
  ok: '',
  warn: 'text-warning-strong',
  over: 'text-destructive',
};

function BudgetProgress({
  summary,
  size,
  onEditBudget,
}: {
  summary: ExpenseSummary;
  size: 'lg' | 'sm';
  onEditBudget: () => void;
}) {
  const t = useTranslations('budget.expensesHero');
  const textSize = size === 'lg' ? 'text-sm' : 'text-[13px]';
  const budget = formatCurrency(summary.budget ?? 0);
  const remaining = summary.remaining ?? 0;
  const amount = (chunks: React.ReactNode) => (
    <b dir="ltr" className="text-foreground">
      {chunks}
    </b>
  );

  return (
    <div className={cn('flex flex-col', size === 'lg' ? 'gap-2' : 'gap-1.5')}>
      <div className="flex items-center gap-2.5">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, summary.budgetPercent)}
          aria-label={t('budgetAria')}
          className="bg-primary/20 h-2 flex-1 overflow-hidden rounded-full"
        >
          <div
            className={cn(
              'h-full min-w-2 rounded-full transition-[width] duration-700',
              PROGRESS_FILL[summary.level],
            )}
            style={{ width: `${Math.min(100, summary.budgetPercent)}%` }}
          />
        </div>
        <span className={cn(textSize, 'font-bold tabular-nums', LEVEL_INK[summary.level])}>
          {summary.budgetPercent}%
        </span>
      </div>
      <div
        className={cn(
          textSize,
          'text-muted-foreground flex items-center justify-between',
          size === 'lg' ? 'gap-3' : 'gap-2',
        )}
      >
        {size === 'lg' ? (
          <span className="flex items-center gap-2">
            <span>{t.rich('ofBudget', { budget, b: amount })}</span>
            <button
              type="button"
              onClick={onEditBudget}
              className="bg-card text-primary hover:bg-card/70 flex h-7 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold transition-colors"
            >
              <IconPencil size={12} stroke={1.8} />
              {t('editBudget')}
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-0.5 whitespace-nowrap">
            <span>{t.rich('ofBudgetShort', { budget, b: amount })}</span>
            <button
              type="button"
              onClick={onEditBudget}
              aria-label={t('editBudgetAria')}
              className="text-primary flex size-8 items-center justify-center rounded-lg"
            >
              <IconPencil size={14} stroke={1.6} />
            </button>
          </span>
        )}
        <span
          className={cn(
            'font-bold whitespace-nowrap',
            LEVEL_INK[summary.level] || 'text-foreground',
          )}
        >
          {remaining < 0
            ? t('over', { amount: formatCurrency(-remaining) })
            : t('remaining', { amount: formatCurrency(remaining) })}
        </span>
      </div>
    </div>
  );
}

function SplitBar({ segments, className }: { segments: ExpenseSegment[]; className: string }) {
  return (
    <div aria-hidden className={cn('flex overflow-hidden rounded-full', className)}>
      {segments.map((segment, i) => (
        <span
          key={segment.key}
          className={cn('min-w-1.5', segmentFill(segment, i))}
          style={{ flex: segment.amount }}
        />
      ))}
    </div>
  );
}

function PaymentTile({
  tone,
  label,
  amount,
  count,
}: {
  tone: 'paid' | 'owed';
  label: string;
  amount: number;
  count: number;
}) {
  const t = useTranslations('budget.expensesHero');

  return (
    <div className="bg-card flex min-w-0 flex-col gap-2 rounded-[14px] p-3">
      <span className="flex items-center gap-2">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg',
            tone === 'paid' ? 'bg-success/10 text-success' : 'bg-warning-tint text-warning-strong',
          )}
        >
          {tone === 'paid' ? <IconCheck size={16} stroke={1.8} /> : <IconClock size={16} stroke={1.6} />}
        </span>
        <span className="text-muted-foreground truncate text-sm font-semibold">{label}</span>
        <span className="text-muted-foreground ms-auto shrink-0 text-xs">
          {t('itemCount', { count })}
        </span>
      </span>
      <span
        dir="ltr"
        className="self-start text-2xl font-extrabold tracking-[-0.02em] whitespace-nowrap tabular-nums"
      >
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function MobilePaymentTile({ tone, label, amount }: { tone: 'paid' | 'owed'; label: string; amount: number }) {
  return (
    <div className="bg-card flex min-w-0 flex-col gap-0.5 rounded-xl px-3 py-2.5">
      <span className="text-muted-foreground flex items-center gap-1.5 text-[13px] font-semibold">
        <span
          className={cn(
            'size-2 shrink-0 rounded-full',
            tone === 'paid' ? 'bg-success' : 'bg-warning-solid',
          )}
        />
        <span className="truncate">{label}</span>
      </span>
      <span dir="ltr" className="self-start text-lg font-extrabold tabular-nums">
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function DesktopHero({ summary, onEditBudget, onAddExpense }: ExpensesHeroProps) {
  const t = useTranslations('budget.expensesHero');
  const segmentLabel = (segment: ExpenseSegment) => (segment.isOther ? t('other') : segment.name);
  // Only reached with a budget set: with no expenses and no budget the tab
  // renders its own empty page instead.
  const emptyBody = t('emptyBody', { budget: formatCurrency(summary.budget ?? 0) });

  return (
    <section
      aria-label={t('label')}
      className="bg-primary/10 hidden gap-8 rounded-3xl p-7 md:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
    >
      {summary.count > 0 ? (
        <>
          <div className="flex min-w-0 flex-col justify-center gap-3.5">
            <span className="text-primary text-sm font-semibold">{t('label')}</span>
            <span
              dir="ltr"
              className="self-start text-[56px] leading-none font-extrabold tracking-[-0.03em] tabular-nums"
            >
              {formatCurrency(summary.total)}
            </span>
            {summary.budget !== null ? (
              <div className="mt-1">
                <BudgetProgress summary={summary} size="lg" onEditBudget={onEditBudget} />
              </div>
            ) : (
              <div className="bg-card border-primary/30 mt-1 flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5">
                <span className="text-muted-foreground flex-1 text-sm leading-snug">
                  {t('setBudgetHint')}
                </span>
                <Button onClick={onEditBudget} className="h-9 rounded-[10px] px-3.5">
                  {t('setBudget')}
                </Button>
              </div>
            )}
            <div className="mt-0.5 grid grid-cols-2 gap-2">
              <PaymentTile tone="paid" label={t('paid')} amount={summary.paid} count={summary.paidCount} />
              <PaymentTile tone="owed" label={t('owed')} amount={summary.owed} count={summary.owedCount} />
            </div>
          </div>

          <div className="bg-card flex min-w-0 flex-col gap-4 rounded-[18px] border p-5">
            <span className="text-[15px] font-bold">{t('byExpense')}</span>
            <SplitBar segments={summary.segments} className="h-3.5" />
            <div className="grid grid-cols-3 gap-x-5 gap-y-3.5">
              {summary.segments.map((segment, i) => (
                <div key={segment.key} className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-muted-foreground flex items-center gap-[7px] text-[13px]">
                    <span className={cn('size-[9px] shrink-0 rounded-full', segmentFill(segment, i))} />
                    <span className="truncate" title={segmentLabel(segment)}>
                      {segmentLabel(segment)}
                    </span>
                  </span>
                  <span dir="ltr" className="self-start text-lg font-bold tabular-nums">
                    {formatCurrency(segment.amount)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t('segmentMeta', { count: segment.count, percent: segment.percent })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-col items-start justify-center gap-3">
            <span className="text-primary text-sm font-semibold">{t('emptyLabel')}</span>
            <h2 className="text-[32px] leading-[1.15] font-extrabold tracking-[-0.02em] text-balance">
              {t('emptyTitle')}
            </h2>
            <p className="text-muted-foreground text-[15px] leading-normal text-pretty">
              {emptyBody}
            </p>
            <Button size="lg" onClick={onAddExpense} className="mt-1 h-11 rounded-xl px-5 text-[15px]">
              {t('emptyCta')}
            </Button>
          </div>

          <div className="bg-card border-primary/30 flex min-w-0 flex-col justify-center gap-4 rounded-[18px] border border-dashed p-5">
            <span className="text-[15px] font-bold">{t('byExpense')}</span>
            <div className="bg-primary/20 h-3.5 rounded-full" />
            <span className="text-muted-foreground text-sm">{t('emptySplitHint')}</span>
          </div>
        </>
      )}
    </section>
  );
}

function MobileHero({ summary, onEditBudget, onAddExpense }: ExpensesHeroProps) {
  const t = useTranslations('budget.expensesHero');
  const segmentLabel = (segment: ExpenseSegment) => (segment.isOther ? t('other') : segment.name);
  const emptyBody = t('emptyBody', { budget: formatCurrency(summary.budget ?? 0) });
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-label={t('label')}
      className="bg-primary/10 flex flex-col gap-3.5 rounded-[20px] p-[18px] md:hidden"
    >
      {summary.count > 0 ? (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-primary text-[13px] font-semibold">{t('label')}</span>
            <span
              dir="ltr"
              className="self-start text-[40px] leading-[1.05] font-extrabold tracking-[-0.03em] tabular-nums"
            >
              {formatCurrency(summary.total)}
            </span>
          </div>
          {summary.budget !== null ? (
            <BudgetProgress summary={summary} size="sm" onEditBudget={onEditBudget} />
          ) : (
            <button
              type="button"
              onClick={onEditBudget}
              className="bg-card border-primary/30 text-primary h-11 rounded-xl border border-dashed text-sm font-semibold"
            >
              {t('setBudget')}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <MobilePaymentTile tone="paid" label={t('paid')} amount={summary.paid} />
            <MobilePaymentTile tone="owed" label={t('owed')} amount={summary.owed} />
          </div>

          <div className="bg-card flex flex-col rounded-[14px]">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="flex h-12 items-center justify-between gap-2 px-3.5 text-sm font-bold"
            >
              <span>{t('byExpense')}</span>
              <span className="text-primary flex items-center gap-1.5 text-[13px] font-semibold">
                {open ? t('hide') : t('show')}
                <IconChevronDown
                  size={14}
                  stroke={1.8}
                  className={cn('transition-transform duration-200', open && 'rotate-180')}
                />
              </span>
            </button>
            {open && (
              <div className="flex flex-col gap-3 px-3.5 pb-3.5">
                <SplitBar segments={summary.segments} className="h-2.5" />
                <div className="flex flex-col">
                  {summary.segments.map((segment, i) => (
                    <div key={segment.key} className="flex items-center gap-2 border-t py-2">
                      <span className={cn('size-2 shrink-0 rounded-full', segmentFill(segment, i))} />
                      <span className="text-muted-foreground flex-1 truncate text-sm">
                        {segmentLabel(segment)}
                      </span>
                      <span className="text-muted-foreground text-xs">{segment.percent}%</span>
                      <span className="w-[84px] text-end text-[15px] font-bold tabular-nums">
                        {formatCurrency(segment.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <span className="text-primary text-[13px] font-semibold">{t('emptyLabel')}</span>
          <h2 className="text-2xl leading-[1.2] font-extrabold">{t('emptyTitle')}</h2>
          <p className="text-muted-foreground text-sm leading-normal">{emptyBody}</p>
          <Button onClick={onAddExpense} className="h-12 rounded-xl text-[15px]">
            {t('emptyCta')}
          </Button>
        </>
      )}
    </section>
  );
}
