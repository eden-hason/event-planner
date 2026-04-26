'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChartNoAxesColumn } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Label as FormLabel } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search } from 'lucide-react';
import { type ExpenseApp } from '../schemas/expenses';
import { formatCurrency } from '../types';
import { setEventBudget, type SetEventBudgetState } from '../actions/event-budget';
import { ExpenseRow } from './expense-row';
import { ExpenseSheet } from './expense-sheet';

interface ExpensesTabProps {
  expenses: ExpenseApp[];
  eventId: string;
  eventBudget: number | null;
  onAddExpense: () => void;
}

function BudgetCard({ expenses, eventId, eventBudget }: {
  expenses: ExpenseApp[];
  eventId: string;
  eventBudget: number | null;
}) {
  const t = useTranslations('budget');
  const [dialogOpen, setDialogOpen] = useState(false);

  const actionWithToast = async (
    _prevState: SetEventBudgetState | null,
    params: { formData: FormData },
  ): Promise<SetEventBudgetState | null> => {
    const promise = setEventBudget(eventId, params.formData).then((result) => {
      if (!result.success) throw new Error(result.message || t('toast.error'));
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.savingBudget'),
      success: (data) => {
        setDialogOpen(false);
        return data.message || t('toast.budgetSaved');
      },
      error: (err) => (err instanceof Error ? err.message : t('toast.error')),
    });

    try {
      return await promise;
    } catch {
      return null;
    }
  };

  const [, formAction, isPending] = useActionState(actionWithToast, null);

  const totalSpent = expenses.reduce((s, e) => s + Number(e.estimate), 0);

  const remaining = eventBudget !== null ? Math.max(0, eventBudget - totalSpent) : 0;
  const isOverBudget = eventBudget !== null && totalSpent > eventBudget;

  const pct = eventBudget !== null && eventBudget > 0
    ? Math.min(100, Math.round((totalSpent / eventBudget) * 100))
    : 0;

  if (eventBudget === null) {
    return (
      <>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pb-6 pt-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <ChartNoAxesColumn className="size-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('budgetCard.emptyDescription')}
            </p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              {t('budgetCard.addBudget')}
            </Button>
          </CardContent>
        </Card>

        <BudgetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          currentBudget={null}
          formAction={formAction}
          isPending={isPending}
          t={t}
        />
      </>
    );
  }

  return (
    <>
      <Card className="flex flex-col gap-2">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-sm font-semibold">{t('budgetCard.title')}</CardTitle>
            <button
              onClick={() => setDialogOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('budgetCard.edit')}
            </button>
          </div>
          <p className="text-2xl font-bold tracking-tight">{formatCurrency(eventBudget)}</p>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 pb-6">
          <div className="space-y-1.5">
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isOverBudget ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₪0</span>
              <span>{pct}%</span>
              <span>{formatCurrency(eventBudget)}</span>
            </div>
          </div>

          <div className="w-full space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">{t('budgetCard.legendExpenses')}</span>
              </div>
              <span className="text-sm font-bold tabular-nums">{formatCurrency(totalSpent)}</span>
            </div>
            {!isOverBudget && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-muted" />
                  <span className="text-xs text-muted-foreground">{t('budgetCard.legendRemaining')}</span>
                </div>
                <span className="text-sm font-bold tabular-nums">{formatCurrency(remaining)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <BudgetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentBudget={eventBudget}
        formAction={formAction}
        isPending={isPending}
        t={t}
      />
    </>
  );
}

function BudgetDialog({
  open,
  onOpenChange,
  currentBudget,
  formAction,
  isPending,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBudget: number | null;
  formAction: (params: { formData: FormData }) => void;
  isPending: boolean;
  t: ReturnType<typeof useTranslations<'budget'>>;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formAction({ formData });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>
            {currentBudget !== null ? t('budgetDialog.titleEdit') : t('budgetDialog.titleAdd')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-2">
            <FormLabel htmlFor="budget-input" className="text-sm">
              {t('budgetDialog.inputLabel')}
            </FormLabel>
            <Input
              id="budget-input"
              name="budget"
              type="number"
              min="1"
              step="1"
              defaultValue={currentBudget ?? ''}
              placeholder={t('budgetDialog.inputPlaceholder')}
              className="mt-1.5"
              autoFocus
            />
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? t('budgetDialog.saving') : t('budgetDialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const PIE_COLORS = [
  '#6366f1', '#ec4899', '#f97316', '#14b8a6', '#22c55e',
  '#eab308', '#06b6d4', '#f43f5e', '#8b5cf6', '#84cc16',
  '#3b82f6', '#a855f7', '#fb923c', '#2dd4bf', '#4ade80',
];

function PieTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { emoji: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium">{item.payload.emoji} {item.name}</p>
      <p className="text-muted-foreground">{formatCurrency(item.value)}</p>
    </div>
  );
}

function ExpensePieCard({ expenses }: { expenses: ExpenseApp[] }) {
  const t = useTranslations('budget');

  const grouped = expenses.reduce<Record<string, { name: string; emoji: string; value: number }>>(
    (acc, exp) => {
      const key = exp.name;
      if (!acc[key]) acc[key] = { name: exp.name, emoji: exp.emoji, value: 0 };
      acc[key].value += Number(exp.estimate);
      return acc;
    },
    {},
  );

  const pieData = Object.values(grouped)
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{t('pieCard.title')}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {pieData.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t('pieCard.noData')}</p>
        ) : (
          <>
            <ChartContainer config={{}} className="mx-auto aspect-square max-h-44">
              <PieChart>
                <Tooltip content={<PieTooltip />} />
                <Pie
                  data={pieData.map((d, i) => ({ ...d, fill: PIE_COLORS[i % PIE_COLORS.length] }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="50%"
                  outerRadius="80%"
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="truncate text-xs text-muted-foreground">
                      {item.emoji} {item.name}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs font-medium tabular-nums">
                    {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ExpensesTab({ expenses, eventId, eventBudget, onAddExpense }: ExpensesTabProps) {
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
        {/* Expenses list — primary content */}
        <div className="order-2 lg:order-1 lg:col-span-2">
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

        {/* Budget sidebar — sticky on desktop */}
        <div className="order-1 lg:order-2 lg:col-span-1 lg:self-start lg:sticky lg:top-4 flex flex-col gap-4">
          <BudgetCard expenses={expenses} eventId={eventId} eventBudget={eventBudget} />
          <ExpensePieCard expenses={expenses} />
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
