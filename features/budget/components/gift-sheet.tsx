'use client';

import { useState, useTransition } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { type GiftApp } from '../schemas/gifts';
import { upsertGift, deleteGift } from '../actions/gifts';

interface GuestOption {
  id: string;
  name: string;
}

interface GiftSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gift: GiftApp | null;
  eventId: string;
  guests: GuestOption[];
}

const FREE_TEXT_KEY = '__other__';

interface FormState {
  guestSelectValue: string;
  guestFreeText: string;
  amount: string;
  isReceived: boolean;
  notes: string;
}

function defaultFormState(gift: GiftApp | null): FormState {
  return {
    guestSelectValue: gift?.guestId ?? FREE_TEXT_KEY,
    guestFreeText: gift?.guestId ? '' : (gift?.guestName ?? ''),
    amount: gift?.amount != null ? String(gift.amount) : '',
    isReceived: gift?.isReceived ?? false,
    notes: gift?.notes ?? '',
  };
}

export function GiftSheet({ open, onOpenChange, gift, eventId, guests }: GiftSheetProps) {
  const t = useTranslations('budget');
  const tCommon = useTranslations('common');
  const isEdit = !!gift?.id;
  const [form, setForm] = useState<FormState>(() => defaultFormState(gift));
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const isFreeText = form.guestSelectValue === FREE_TEXT_KEY;
  const resolvedGuestId = isFreeText ? null : form.guestSelectValue;
  const resolvedGuestName = isFreeText
    ? form.guestFreeText.trim()
    : (guests.find((g) => g.id === form.guestSelectValue)?.name ?? '');

  const isValid = resolvedGuestName.length > 0 && Number(form.amount) > 0;

  const handleOpenChange = (next: boolean) => {
    if (next) setForm(defaultFormState(gift));
    onOpenChange(next);
  };

  const handleSave = () => {
    if (!isValid) return;
    const fd = new FormData();
    if (gift?.id) fd.set('id', gift.id);
    if (resolvedGuestId) fd.set('guestId', resolvedGuestId);
    fd.set('guestName', resolvedGuestName);
    fd.set('amount', form.amount);
    fd.set('isReceived', String(form.isReceived));
    fd.set('notes', form.notes.trim());

    startTransition(() => {
      const promise = upsertGift(eventId, fd).then((res) => {
        if (!res.success) throw new Error(res.message ?? t('toast.error'));
        return res;
      });

      toast.promise(promise, {
        loading: isEdit ? t('toast.savingGift') : t('toast.addingGift'),
        success: isEdit ? t('toast.giftUpdated') : t('toast.giftAdded'),
        error: (err) => (err instanceof Error ? err.message : t('toast.error')),
      });

      promise.then(() => onOpenChange(false)).catch(() => {});
    });
  };

  const handleDelete = () => {
    if (!gift?.id) return;
    const id = gift.id;
    onOpenChange(false);

    const promise = deleteGift(id, eventId).then((res) => {
      if (!res.success) throw new Error(res.message);
      return res;
    });

    toast.promise(promise, {
      loading: t('toast.deletingGift'),
      success: t('toast.giftDeleted'),
      error: (err) => (err instanceof Error ? err.message : t('toast.error')),
    });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="m-3 flex h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-clip rounded-xl border-0 p-0 data-[state=closed]:duration-200 data-[state=open]:duration-200 sm:max-w-[480px]"
        onOpenAutoFocus={(e) => {
          if (isEdit) e.preventDefault();
        }}
      >
        <SheetHeader className="border-b px-6 py-5">
          <SheetDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isEdit ? t('giftSheet.editLabel') : t('giftSheet.newLabel')}
          </SheetDescription>
          <SheetTitle className="text-xl">
            {isEdit ? gift.guestName : t('addGift')}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div className="space-y-1.5">
            <Label>{t('giftSheet.guest')} *</Label>
            <Select
              value={form.guestSelectValue}
              onValueChange={(v) => set('guestSelectValue', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('giftSheet.guestPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {guests.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
                <SelectItem value={FREE_TEXT_KEY}>{t('giftSheet.guestOther')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isFreeText && (
            <div className="space-y-1.5">
              <Label htmlFor="gift-name">{t('giftSheet.guestName')} *</Label>
              <Input
                id="gift-name"
                value={form.guestFreeText}
                onChange={(e) => set('guestFreeText', e.target.value)}
                placeholder={t('giftSheet.guestNamePlaceholder')}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="gift-amount">{t('giftSheet.amount')} *</Label>
            <Input
              id="gift-amount"
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0"
            />
          </div>

          <button
            type="button"
            onClick={() => set('isReceived', !form.isReceived)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border p-3 transition-colors',
              form.isReceived ? 'border-green-200 bg-green-50' : 'border-border bg-muted/30',
            )}
          >
            <div
              className={cn(
                'flex size-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                form.isReceived
                  ? 'border-green-600 bg-green-600'
                  : 'border-muted-foreground/40 bg-background',
              )}
            >
              {form.isReceived && <span className="text-[10px] text-white">✓</span>}
            </div>
            <span className={cn('text-sm font-medium', form.isReceived ? 'text-green-700' : 'text-foreground')}>
              {form.isReceived ? t('giftSheet.receivedLabel') : t('giftSheet.markReceived')}
            </span>
          </button>

          <div className="space-y-1.5">
            <Label htmlFor="gift-notes">{t('giftSheet.notes')}</Label>
            <Textarea
              id="gift-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder={t('giftSheet.notesPlaceholder')}
              rows={3}
            />
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
