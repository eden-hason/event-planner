'use client';

import { useActionState, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { IconFilter2, IconSearch } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as FormLabel } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { type ExpenseApp } from '../schemas/expenses';
import { setEventBudget, removeEventBudget, type SetEventBudgetState } from '../actions/event-budget';
import { ExpenseRow } from './expense-row';
import { ExpenseSheet } from './expense-sheet';
import { ExpensesHero } from './expenses-hero';
import { buildExpensesSheetRows, toFileName } from '../utils/export-budget';
import {
  EXPENSE_FILTERS,
  EXPENSE_STATUSES,
  expenseFilterCount,
  matchesExpenseFilter,
  summarizeExpenses,
  type ExpenseFilter,
} from '../utils/expense-summary';
import { EXPENSE_STATUS_LABEL_KEYS, type ExpenseStatus } from '../types';
import { DownloadSheetButton } from './download-sheet-button';
import { FilterChips } from './filter-chips';

interface ExpensesTabProps {
  expenses: ExpenseApp[];
  eventId: string;
  eventName?: string;
  eventBudget: number | null;
  onAddExpense: () => void;
}

function BudgetDialog({
  open,
  onOpenChange,
  currentBudget,
  formAction,
  isPending,
  onDelete,
  isDeleting,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBudget: number | null;
  formAction: (params: { formData: FormData }) => void;
  isPending: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  t: ReturnType<typeof useTranslations<'budget'>>;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formAction({ formData });
  };

  const isAnyPending = isPending || isDeleting;

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
          <DialogFooter className="mt-4 flex-col gap-2 sm:flex-col">
            <Button type="submit" disabled={isAnyPending} className="w-full">
              {isPending ? t('budgetDialog.saving') : t('budgetDialog.save')}
            </Button>
            {currentBudget !== null && (
              <Button
                type="button"
                variant="outline"
                disabled={isAnyPending}
                onClick={onDelete}
                className="w-full gap-1.5 border-destructive text-destructive hover:bg-destructive/5 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                {isDeleting ? t('budgetDialog.deleting') : t('budgetDialog.delete')}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExpensesTab({ expenses, eventId, eventName, eventBudget, onAddExpense }: ExpensesTabProps) {
  const t = useTranslations('budget');
  const [editExpense, setEditExpense] = useState<ExpenseApp | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ExpenseFilter>('all');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | null>(null);
  const summary = useMemo(() => summarizeExpenses(expenses, eventBudget), [expenses, eventBudget]);
  const statusLabel = (status: ExpenseStatus) =>
    t(`expenseRow.${EXPENSE_STATUS_LABEL_KEYS[status]}`);
  const filterItems = EXPENSE_FILTERS.map((key) => ({
    key,
    label: t(`expenseFilters.${key}`),
    count: expenseFilterCount(summary, key),
  }));


  const budgetActionWithToast = async (
    _prevState: SetEventBudgetState | null,
    params: { formData: FormData },
  ): Promise<SetEventBudgetState | null> => {
    const promise = setEventBudget(eventId, params.formData).then((result) => {
      if (!result.success) throw new Error(result.message || t('toast.error'));
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.savingBudget'),
      success: () => {
        setBudgetDialogOpen(false);
        return t('toast.budgetSaved');
      },
      error: (err) => (err instanceof Error ? err.message : t('toast.error')),
    });

    try {
      return await promise;
    } catch {
      return null;
    }
  };

  const [, budgetFormAction, isBudgetPending] = useActionState(budgetActionWithToast, null);

  const [isDeleteBudgetPending, setIsDeleteBudgetPending] = useState(false);

  const handleDeleteBudget = () => {
    setIsDeleteBudgetPending(true);
    const promise = removeEventBudget(eventId).then((result) => {
      if (!result.success) throw new Error(result.message || t('toast.error'));
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.removingBudget'),
      success: () => {
        setBudgetDialogOpen(false);
        return t('toast.budgetRemoved');
      },
      error: (err) => (err instanceof Error ? err.message : t('toast.error')),
    });

    promise.finally(() => setIsDeleteBudgetPending(false));
  };

  const handleRowClick = (expense: ExpenseApp) => {
    setEditExpense(expense);
    setSheetOpen(true);
  };

  const handleSheetClose = (open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditExpense(null);
  };

  const q = search.trim().toLowerCase();
  const filteredExpenses = expenses.filter(
    (exp) =>
      matchesExpenseFilter(exp, filter, statusFilter) &&
      (!q ||
        exp.name.toLowerCase().includes(q) ||
        (exp.vendorName ?? '').toLowerCase().includes(q)),
  );

  if (expenses.length === 0 && eventBudget === null) {
    return (
      <>
        <div className="flex min-h-[calc(100vh-280px)] flex-col items-center justify-center overflow-hidden rounded-xl border bg-card shadow-sm text-center">
            <img src="/hero-coins.svg" alt="" aria-hidden="true" className="h-64 w-64" />
            <p className="font-semibold text-foreground">{t('expenseEmpty.title')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('expenseEmpty.description')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Button onClick={onAddExpense}>{t('expenseEmpty.cta')}</Button>
              {eventBudget === null && (
                <Button variant="outline" onClick={() => setBudgetDialogOpen(true)}>
                  {t('budgetCard.addBudget')}
                </Button>
              )}
            </div>
        </div>

        <BudgetDialog
          open={budgetDialogOpen}
          onOpenChange={setBudgetDialogOpen}
          currentBudget={eventBudget}
          formAction={budgetFormAction}
          isPending={isBudgetPending}
          onDelete={handleDeleteBudget}
          isDeleting={isDeleteBudgetPending}
          t={t}
        />
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
      <div className="flex flex-col gap-4">
        <ExpensesHero
          summary={summary}
          onEditBudget={() => setBudgetDialogOpen(true)}
          onAddExpense={onAddExpense}
        />

        {expenses.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-[7px] md:gap-2">
              <label className="border-input bg-card focus-within:border-ring focus-within:ring-ring/50 flex h-10 min-w-0 flex-1 items-center gap-[7px] rounded-[11px] border px-[11px] focus-within:ring-[3px] md:h-9 md:max-w-[290px] md:gap-2 md:rounded-[10px]">
                <IconSearch size={16} className="text-muted-foreground shrink-0" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('expenseSearchPlaceholder')}
                  // 16px keeps iOS from zooming the page into the field.
                  className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base outline-none md:text-[13.5px] [&::-webkit-search-cancel-button]:hidden"
                />
              </label>
              <FilterChips
                items={filterItems}
                value={filter}
                onChange={setFilter}
                variant="segmented"
                className="hidden md:flex"
              />
              <div className="hidden md:block">
                <Select
                  value={statusFilter ?? 'all'}
                  onValueChange={(value) =>
                    setStatusFilter(
                      EXPENSE_STATUSES.find((status) => status === value) ?? null,
                    )
                  }
                >
                  <SelectTrigger
                    className={cn(
                      'gap-[7px] rounded-[10px] px-3 text-[13.5px] font-semibold',
                      statusFilter && 'border-primary bg-primary/8 text-primary hover:bg-primary/12',
                    )}
                  >
                    <IconFilter2 size={16} className={statusFilter ? 'text-primary' : 'text-foreground'} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('expenseFilters.allStatuses')}</SelectItem>
                    {EXPENSE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DownloadSheetButton
                fileName={toFileName(eventName, t('export.expensesFileName'))}
                sheetName={t('export.expensesFileName')}
                getRows={() =>
                  buildExpensesSheetRows(expenses, {
                    headers: [
                      t('export.expenseHeaders.name'),
                      t('export.expenseHeaders.vendor'),
                      t('export.expenseHeaders.phone'),
                      t('export.expenseHeaders.price'),
                      t('export.expenseHeaders.advance'),
                      t('export.expenseHeaders.status'),
                    ],
                    total: t('export.total'),
                    status: statusLabel,
                  })
                }
                className="md:ms-auto"
              />
            </div>
            <FilterChips
              items={filterItems}
              value={filter}
              onChange={setFilter}
              variant="pill"
              className="md:hidden"
            />

            {filteredExpenses.length > 0 ? (
              <div className="bg-card overflow-hidden rounded-[14px] border">
                {filteredExpenses.map((exp) => (
                  <ExpenseRow key={exp.id} expense={exp} onClick={handleRowClick} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-4 text-center text-sm">
                {q ? t('expenseSearchEmpty') : t('expenseFilters.empty')}
              </p>
            )}
          </div>
        )}
      </div>

      <BudgetDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        currentBudget={eventBudget}
        formAction={budgetFormAction}
        isPending={isBudgetPending}
        onDelete={handleDeleteBudget}
        isDeleting={isDeleteBudgetPending}
        t={t}
      />
      <ExpenseSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        expense={editExpense}
        eventId={eventId}
      />
    </>
  );
}
