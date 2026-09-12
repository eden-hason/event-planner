'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconMinus, IconPlus, IconX } from '@tabler/icons-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  autoFixPhone,
  validateGuestData,
  type ValidatedRowData,
} from '@/features/guests/utils/import-guests';
import type { GroupApp } from '@/features/guests/schemas';
import { GroupCombobox } from './group-combobox';

export interface RowEditDraft {
  name: string;
  phone: string;
  amount: number;
  side: 'bride' | 'groom' | null;
  group: string;
}

interface MobileRowEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ValidatedRowData | null;
  groups: GroupApp[];
  isNewGroup: boolean;
  existingPhones: Map<string, string>;
  otherCsvPhones: Set<string>;
  onSave: (draft: RowEditDraft) => void;
  onRemove: () => void;
}

const SIDES: Array<'bride' | 'groom' | null> = [null, 'bride', 'groom'];

export function MobileRowEditSheet({
  open,
  onOpenChange,
  data,
  groups,
  isNewGroup,
  existingPhones,
  otherCsvPhones,
  onSave,
  onRemove,
}: MobileRowEditSheetProps) {
  const t = useTranslations('guests.import.mobile.edit');
  const tCommon = useTranslations('common');

  const [draft, setDraft] = useState<RowEditDraft>({
    name: '',
    phone: '',
    amount: 1,
    side: null,
    group: '',
  });

  useEffect(() => {
    if (open && data) {
      setDraft({
        name: data.name ?? '',
        phone: data.phone ?? '',
        amount: data.amount ?? 1,
        side: data.side ?? null,
        group: data.group ?? '',
      });
    }
  }, [open, data]);

  const validation = validateGuestData(
    {
      name: draft.name,
      phone: draft.phone || undefined,
      amount: draft.amount,
      side: draft.side,
      group: draft.group || undefined,
    },
    existingPhones,
    otherCsvPhones,
  );

  const phoneError = validation.fieldErrors.phone;
  const nameError = validation.fieldErrors.name;
  const phoneSuggestion = phoneError ? autoFixPhone(draft.phone) : null;

  const issuesCount = Object.keys(validation.fieldErrors).length;

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex max-h-[92dvh] flex-col gap-0 overflow-y-auto rounded-t-xl border-0 p-0 pb-[env(safe-area-inset-bottom)] data-[state=closed]:duration-200 data-[state=open]:duration-200"
      >
        <SheetHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div className="flex flex-col gap-0.5">
            <SheetTitle>
              {draft.name ? t('title', { name: draft.name }) : t('titleUnnamed')}
            </SheetTitle>
            {issuesCount > 0 && (
              <span className="text-muted-foreground text-xs">
                {t('issuesCount', { count: issuesCount })}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={tCommon('close')}
            className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg"
          >
            <IconX size={18} />
          </button>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className={cn(nameError && 'text-destructive')}>
              {t('nameLabel')} <span className="text-destructive">*</span>
            </Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className={cn(nameError && 'border-destructive')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className={cn(phoneError && 'text-destructive')}>
              {phoneError ? t('phoneInvalid') : t('phoneLabel')}
            </Label>
            <Input
              dir="ltr"
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              className={cn(phoneError && 'border-destructive bg-destructive/5')}
            />
            {phoneError && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-destructive text-xs">
                  {t('phoneRequiredFormat')}
                </span>
                {phoneSuggestion && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({ ...d, phone: phoneSuggestion }))
                    }
                    className="text-primary shrink-0 text-xs font-semibold"
                  >
                    {t('phoneSuggestion', { value: phoneSuggestion })}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>{t('amountLabel')}</Label>
              <div className="flex h-11 items-center overflow-hidden rounded-lg border">
                <button
                  type="button"
                  aria-label={t('amountDecrease')}
                  onClick={() =>
                    setDraft((d) => ({ ...d, amount: Math.max(1, d.amount - 1) }))
                  }
                  className="text-muted-foreground flex h-full w-11 items-center justify-center"
                >
                  <IconMinus size={16} />
                </button>
                <span className="flex-1 text-center text-[15px] font-semibold">
                  {draft.amount}
                </span>
                <button
                  type="button"
                  aria-label={t('amountIncrease')}
                  onClick={() => setDraft((d) => ({ ...d, amount: d.amount + 1 }))}
                  className="text-muted-foreground flex h-full w-11 items-center justify-center"
                >
                  <IconPlus size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>{t('sideLabel')}</Label>
              <div className="bg-muted flex h-11 gap-0.5 rounded-lg p-0.5">
                {SIDES.map((side) => {
                  const active = draft.side === side;
                  return (
                    <button
                      key={side ?? 'none'}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, side }))}
                      className={cn(
                        'flex-1 rounded-md text-xs font-semibold transition-colors',
                        active
                          ? 'bg-card text-primary shadow-sm'
                          : 'text-muted-foreground',
                      )}
                    >
                      {side === 'bride'
                        ? t('sideBride')
                        : side === 'groom'
                          ? t('sideGroom')
                          : t('sideNone')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>{t('groupLabel')}</Label>
              {isNewGroup && draft.group && (
                <span className="bg-warning/15 text-warning rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  {t('groupNewBadge')}
                </span>
              )}
            </div>
            <GroupCombobox
              groups={groups}
              side={draft.side}
              value={draft.group || null}
              onChange={(name) =>
                setDraft((d) => ({ ...d, group: name ?? '' }))
              }
            />
          </div>

          <div className="mt-2 flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              {t('save')}
            </Button>
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => {
                onRemove();
                onOpenChange(false);
              }}
            >
              {t('removeRow')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
