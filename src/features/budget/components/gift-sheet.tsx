'use client';

import { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { PAYMENT_METHODS, type PaymentMethodKey } from '../types';

export interface GiftSheetValues {
  guestName: string;
  amount: number | '';
  paymentMethod: PaymentMethodKey | '';
  notes: string;
}

export interface GiftSheetEntry extends GiftSheetValues {
  /** A confirmed guest's row: the name comes from the guest list and stays as is. */
  isGuest: boolean;
}

interface GiftSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row being edited, or null to add a gift by hand. */
  gift: GiftSheetEntry | null;
  /** Confirmed guests with no amount yet, offered while typing a new gift's name. */
  guestSuggestions: string[];
  /** Rejects when the save fails; the sheet stays open and shows the error. */
  onSave: (values: GiftSheetValues) => Promise<void>;
  onDelete?: () => void;
}

const EMPTY: GiftSheetValues = { guestName: '', amount: '', paymentMethod: '', notes: '' };

export function GiftSheet({
  open,
  onOpenChange,
  gift,
  guestSuggestions,
  onSave,
  onDelete,
}: GiftSheetProps) {
  const t = useTranslations('budget');
  const tCommon = useTranslations('common');
  const isEdit = gift !== null;
  const [form, setForm] = useState<GiftSheetValues>(gift ?? EMPTY);
  const [isPending, setIsPending] = useState(false);
  const suggestionsId = useId();

  useEffect(() => {
    if (open) setForm(gift ?? EMPTY);
  }, [open, gift]);

  const set = <K extends keyof GiftSheetValues>(key: K, value: GiftSheetValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // A new gift needs an amount - that is what recording one means. An edit may
  // clear it, which puts the guest back among the ones still to log.
  const amountValid = form.amount === '' ? isEdit : Number(form.amount) > 0;
  const isValid = form.guestName.trim().length > 0 && amountValid;

  const handleSave = () => {
    if (!isValid) return;
    const values: GiftSheetValues = {
      ...form,
      guestName: form.guestName.trim(),
      notes: form.notes.trim(),
    };

    // Not a transition: `onSave` updates the list before it awaits the server,
    // and inside a transition that update would wait for the save to finish.
    setIsPending(true);
    const promise = onSave(values);
    toast.promise(promise, {
      loading: isEdit ? t('toast.savingGift') : t('toast.addingGift'),
      success: isEdit ? t('toast.giftUpdated') : t('toast.giftAdded'),
      error: (err) => (err instanceof Error ? err.message : t('toast.giftSaveFailed')),
    });
    promise
      .then(() => onOpenChange(false))
      // The toast already says so; the form keeps what was typed.
      .catch(() => {})
      .finally(() => setIsPending(false));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="m-3 flex h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-clip rounded-xl border-0 p-0 data-[state=closed]:duration-200 data-[state=open]:duration-200 sm:max-w-120"
        onOpenAutoFocus={(e) => {
          if (isEdit) e.preventDefault();
        }}
      >
        <SheetHeader className="border-b px-6 py-5">
          <SheetDescription className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            {isEdit ? t('giftSheet.editLabel') : t('giftSheet.newLabel')}
          </SheetDescription>
          <SheetTitle className="text-xl">
            {isEdit ? gift.guestName : t('newGift')}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div className="space-y-1.5">
            <Label htmlFor="gift-guest-name">{t('giftSheet.guestName')} *</Label>
            <Input
              id="gift-guest-name"
              value={form.guestName}
              onChange={(e) => set('guestName', e.target.value)}
              placeholder={t('giftSheet.guestNamePlaceholder')}
              readOnly={gift?.isGuest}
              className={cn(gift?.isGuest && 'bg-muted/40 text-muted-foreground')}
              list={!isEdit && guestSuggestions.length > 0 ? suggestionsId : undefined}
              autoComplete="off"
            />
            {!isEdit && guestSuggestions.length > 0 && (
              <datalist id={suggestionsId}>
                {guestSuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            )}
            {!isEdit && (
              <p className="text-muted-foreground text-xs">{t('giftSheet.guestNameHint')}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gift-amount">
              {t('giftSheet.amount')}
              {!isEdit && ' *'}
            </Label>
            <Input
              id="gift-amount"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.amount}
              onChange={(e) => set('amount', e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('giftTable.paymentMethod')}</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={2}
              value={form.paymentMethod}
              onValueChange={(value) => set('paymentMethod', value as PaymentMethodKey | '')}
              className="flex w-full flex-wrap"
            >
              {PAYMENT_METHODS.map((key) => (
                <ToggleGroupItem
                  key={key}
                  value={key}
                  className="data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary h-9 rounded-full px-4 data-[state=on]:font-semibold"
                >
                  {t(`paymentMethods.${key}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gift-notes">{t('giftSheet.notes')}</Label>
            <Input
              id="gift-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder={t('giftSheet.notesPlaceholder')}
            />
          </div>
        </div>

        <SheetFooter className="flex-row justify-between border-t px-6 py-4 sm:flex-row">
          <div>
            {isEdit && onDelete && (
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onDelete}
                disabled={isPending}
              >
                {t('giftSheet.delete')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!isValid || isPending}>
              {isEdit ? t('giftSheet.saveChanges') : t('addGift')}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
