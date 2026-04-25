'use client';

import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';
import {
  IconBuildingStore,
  IconCircleCheckFilled,
  IconCircleDashed,
  IconCreditCard,
  IconTag,
} from '@tabler/icons-react';
import { type ExpenseApp } from '../schemas/expenses';
import { upsertExpense, deleteExpense } from '../actions/expenses';
import { EXPENSE_PRESETS } from '../types';

interface ExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseApp | null;
  eventId: string;
  existingExpenses?: ExpenseApp[];
}

interface FormState {
  name: string;
  emoji: string;
  vendorName: string;
  vendorPhone: string;
  estimate: string;
  fullyPaid: boolean;
  hasAdvance: boolean;
  advanceAmount: string;
  advancePaid: boolean;
}

function defaultFormState(expense: ExpenseApp | null): FormState {
  return {
    name: expense?.name ?? '',
    emoji: expense?.emoji ?? '💸',
    vendorName: expense?.vendorName ?? '',
    vendorPhone: expense?.vendorPhone ?? '',
    estimate: expense?.estimate != null ? String(expense.estimate) : '',
    fullyPaid: expense?.fullyPaid ?? false,
    hasAdvance: expense?.hasAdvance ?? false,
    advanceAmount:
      expense?.advanceAmount != null && expense.advanceAmount > 0
        ? String(expense.advanceAmount)
        : '',
    advancePaid: expense?.advancePaid ?? false,
  };
}

export function ExpenseSheet({ open, onOpenChange, expense, eventId, existingExpenses = [] }: ExpenseSheetProps) {
  const t = useTranslations('budget');
  const tCommon = useTranslations('common');
  const isEdit = !!expense?.id;
  const [form, setForm] = useState<FormState>(() => defaultFormState(expense));
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setForm(defaultFormState(expense));
      setSelectedPresetKey(null);
      setAnimKey(0);
    }
  }, [open, expense]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const isValid = form.name.trim().length > 0 && Number(form.estimate) > 0;

  const existingNames = new Set(existingExpenses.map((e) => e.name));

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const applyPreset = (key: string, name: string, emoji: string, estimate: number) => {
    if (selectedPresetKey === key) {
      setSelectedPresetKey(null);
      setForm((p) => ({ ...p, name: '', emoji: '💸', estimate: '' }));
      return;
    }
    setSelectedPresetKey(key);
    setForm((p) => ({ ...p, name, emoji, estimate: String(estimate) }));
    setAnimKey((k) => k + 1);
  };

  const handleSave = () => {
    if (!isValid) return;
    const fd = new FormData();
    if (expense?.id) fd.set('id', expense.id);
    fd.set('name', form.name.trim());
    fd.set('emoji', form.emoji);
    fd.set('vendorName', form.vendorName.trim());
    fd.set('vendorPhone', form.vendorPhone.trim());
    fd.set('estimate', form.estimate);
    fd.set('fullyPaid', String(form.fullyPaid));
    fd.set('hasAdvance', String(form.hasAdvance));
    fd.set('advanceAmount', form.advanceAmount || '0');
    fd.set('advancePaid', String(form.advancePaid));

    startTransition(() => {
      const promise = upsertExpense(eventId, fd).then((res) => {
        if (!res.success) throw new Error(res.message ?? t('toast.error'));
        return res;
      });

      toast.promise(promise, {
        loading: isEdit ? t('toast.savingExpense') : t('toast.addingExpense'),
        success: isEdit ? t('toast.expenseUpdated') : t('toast.expenseAdded'),
        error: (err) => (err instanceof Error ? err.message : t('toast.error')),
      });

      promise.then(() => {
        setForm(defaultFormState(null));
        setSelectedPresetKey(null);
        onOpenChange(false);
      }).catch(() => {});
    });
  };

  const handleDelete = () => {
    if (!expense?.id) return;
    const id = expense.id;
    onOpenChange(false);

    const promise = deleteExpense(id, eventId).then((res) => {
      if (!res.success) throw new Error(res.message);
      return res;
    });

    toast.promise(promise, {
      loading: t('toast.deletingExpense'),
      success: t('toast.expenseDeleted'),
      error: (err) => (err instanceof Error ? err.message : t('toast.error')),
    });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="m-3 flex h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-clip rounded-xl border-0 p-0 data-[state=closed]:duration-200 data-[state=open]:duration-200 sm:max-w-120"
        onOpenAutoFocus={(e) => {
          if (isEdit) e.preventDefault();
        }}
      >
        <SheetHeader className="border-b px-6 py-5">
          <SheetDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isEdit ? t('expenseSheet.editLabel') : t('expenseSheet.newLabel')}
          </SheetDescription>
          <SheetTitle className="text-xl">
            {isEdit ? expense.name : t('addExpense')}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">

          {/* Preset chips — new expense only */}
          {!isEdit && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('expenseSheet.presetsLabel')}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {EXPENSE_PRESETS.map((preset) => {
                  const name = t(`presetNames.${preset.key}` as Parameters<typeof t>[0]);
                  const alreadyAdded = existingNames.has(name);
                  const selected = selectedPresetKey === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => !alreadyAdded && applyPreset(preset.key, name, preset.emoji, preset.estimate)}
                      className={cn(
                        'flex shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 transition-colors',
                        selected
                          ? 'border-primary/40 bg-primary/5 text-primary'
                          : alreadyAdded
                          ? 'cursor-default border-border bg-muted/20 opacity-40'
                          : 'border-border bg-muted/30 hover:border-primary/30 hover:bg-primary/5 cursor-pointer',
                      )}
                      disabled={alreadyAdded}
                      title={name}
                    >
                      <span className="text-lg leading-none">{preset.emoji}</span>
                      <span className="whitespace-nowrap text-[11px] font-medium">{name}</span>
                    </button>
                  );
                })}
              </div>

            </div>
          )}

          {/* Expense Details */}
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <IconTag size={16} className="text-muted-foreground" />
              {t('expenseSheet.sectionExpenseDetails')}
            </h3>
            <div className="space-y-1.5" key={`name-${animKey}`}>
              <Label htmlFor="exp-name">{t('expenseSheet.name')} *</Label>
              <Input
                id="exp-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder={t('expenseSheet.namePlaceholder')}
              />
            </div>
            <div className="space-y-1.5" key={`estimate-${animKey}`}>
              <Label htmlFor="exp-price">{t('expenseSheet.price')} *</Label>
              <Input
                id="exp-price"
                type="number"
                min={0}
                value={form.estimate}
                onChange={(e) => set('estimate', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Vendor */}
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <IconBuildingStore size={16} className="text-muted-foreground" />
              {t('expenseSheet.sectionVendor')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-vendor">{t('expenseSheet.vendor')}</Label>
                <Input
                  id="exp-vendor"
                  value={form.vendorName}
                  onChange={(e) => set('vendorName', e.target.value)}
                  placeholder={t('expenseSheet.vendorPlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-vendor-phone">{t('expenseSheet.vendorPhone')}</Label>
                <Input
                  id="exp-vendor-phone"
                  type="tel"
                  dir="ltr"
                  className="rtl:text-right"
                  value={form.vendorPhone}
                  onChange={(e) => set('vendorPhone', e.target.value)}
                  placeholder={t('expenseSheet.vendorPhonePlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <IconCreditCard size={16} className="text-muted-foreground" />
              {t('expenseSheet.sectionPayment')}
            </h3>

            <div className={cn(
              'rounded-xl border transition-colors',
              form.hasAdvance
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-muted/30 hover:bg-muted/40',
            )}>
              <Toggle
                pressed={form.hasAdvance}
                onPressedChange={(v) => set('hasAdvance', v)}
                className="flex h-auto w-full items-center justify-between rounded-xl bg-transparent p-3.5 text-start hover:bg-transparent data-[state=on]:bg-transparent"
              >
                <div>
                  <p className={cn('text-sm font-medium', form.hasAdvance ? 'text-primary' : 'text-foreground')}>
                    {t('expenseSheet.advanceToggle')}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('expenseSheet.advanceHint')}</p>
                </div>
                {form.hasAdvance
                  ? <IconCircleCheckFilled size={20} className="shrink-0 text-primary" />
                  : <IconCircleDashed size={20} className="shrink-0 text-muted-foreground" />}
              </Toggle>
              <div className={cn('grid transition-all duration-300 ease-in-out', form.hasAdvance ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="overflow-hidden">
                <div className="space-y-3 px-3.5 pb-3.5 pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="exp-advance">{t('expenseSheet.advanceAmount')}</Label>
                    <Input
                      id="exp-advance"
                      type="number"
                      min={0}
                      value={form.advanceAmount}
                      onChange={(e) => set('advanceAmount', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <Toggle
                    pressed={form.advancePaid}
                    onPressedChange={(v) => set('advancePaid', v)}
                    className={cn(
                      'flex h-auto w-full items-center justify-between rounded-xl border p-3 text-left transition-colors',
                      'data-[state=off]:border-border data-[state=off]:bg-background data-[state=off]:hover:bg-muted/30',
                      'data-[state=on]:border-green-200 data-[state=on]:bg-green-50 data-[state=on]:hover:bg-green-50',
                    )}
                  >
                    <span className={cn('text-sm font-medium', form.advancePaid ? 'text-green-700' : 'text-foreground')}>
                      {form.advancePaid ? t('expenseSheet.advancePaidLabel') : t('expenseSheet.advanceNotPaidLabel')}
                    </span>
                    {form.advancePaid
                      ? <IconCircleCheckFilled size={20} className="shrink-0 text-green-600" />
                      : <IconCircleDashed size={20} className="shrink-0 text-muted-foreground" />}
                  </Toggle>
                </div>
                </div>
              </div>
            </div>

            <Toggle
              pressed={form.fullyPaid}
              onPressedChange={(v) => set('fullyPaid', v)}
              className={cn(
                'flex h-auto w-full items-center justify-between rounded-xl border p-3.5 text-left transition-colors',
                'data-[state=off]:border-border data-[state=off]:bg-muted/30 data-[state=off]:hover:bg-muted/40',
                'data-[state=on]:border-green-200 data-[state=on]:bg-green-50 data-[state=on]:hover:bg-green-50',
              )}
            >
              <p className={cn('text-sm font-medium', form.fullyPaid ? 'text-green-700' : 'text-foreground')}>
                {form.fullyPaid ? t('expenseSheet.fullyPaidLabel') : t('expenseSheet.markFullyPaid')}
              </p>
              {form.fullyPaid
                ? <IconCircleCheckFilled size={20} className="shrink-0 text-green-600" />
                : <IconCircleDashed size={20} className="shrink-0 text-muted-foreground" />}
            </Toggle>
          </div>
        </div>

        <SheetFooter className="flex-row justify-between border-t px-6 py-4 sm:flex-row">
          <div>
            {isEdit && (
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {t('expenseSheet.delete')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!isValid || isPending}>
              {isEdit ? t('expenseSheet.saveChanges') : t('addExpense')}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
