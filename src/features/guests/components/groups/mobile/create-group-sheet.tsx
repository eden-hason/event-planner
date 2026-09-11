'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { IconArrowLeft, IconArrowRight, IconCheck, IconX } from '@tabler/icons-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GROUP_ICONS, GROUP_SIDES, GroupSide } from '@/features/guests/schemas';
import { GroupIcon } from '../group-icon';
import { cn } from '@/lib/utils';

interface CreateGroupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGroup: (formData: FormData) => void;
  onCreateAndAssign: (formData: FormData) => void;
}

// Same side -> tint mapping as GroupMobileCard/GroupCard, so the live
// preview matches how the group will actually look in the list.
const SIDE_TINT: Record<GroupSide, { bg: string; text: string; dot: string }> = {
  bride: { bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' },
  groom: { bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-500' },
};

export function CreateGroupSheet({
  open,
  onOpenChange,
  onCreateGroup,
  onCreateAndAssign,
}: CreateGroupSheetProps) {
  const t = useTranslations('guests');
  const tCommon = useTranslations('common');
  const isRTL = useLocale() === 'he';

  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fSide, setFSide] = useState<GroupSide | null>(null);
  const [fIcon, setFIcon] = useState<(typeof GROUP_ICONS)[number]>('IconUsers');

  const canCreate = fName.trim().length > 0;
  const tint = fSide ? SIDE_TINT[fSide] : null;

  const reset = () => {
    setFName('');
    setFDesc('');
    setFSide(null);
    setFIcon('IconUsers');
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append('name', fName.trim());
    if (fDesc.trim()) formData.append('description', fDesc.trim());
    formData.append('icon', fIcon);
    if (fSide) formData.append('side', fSide);
    return formData;
  };

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) reset();
  };

  const handleCreate = () => {
    if (!canCreate) return;
    const formData = buildFormData();
    handleClose(false);
    onCreateGroup(formData);
  };

  const handleCreateAndAssign = () => {
    if (!canCreate) return;
    const formData = buildFormData();
    handleClose(false);
    onCreateAndAssign(formData);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="[&_[data-slot=sheet-close]]:hidden flex h-[92dvh] flex-col gap-0 overflow-clip rounded-t-xl border-0 p-0 data-[state=closed]:duration-200 data-[state=open]:duration-200"
      >
        <SheetHeader className="flex-row items-center gap-3 border-b px-4 pt-5 pb-3">
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="bg-muted text-muted-foreground flex size-[34px] shrink-0 items-center justify-center rounded-[9px]"
            aria-label={tCommon('close')}
          >
            <IconX size={18} />
          </button>
          <SheetTitle className="flex-1 text-[17px]">{t('groups.dialog.title')}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto p-4">
          {/* Live preview */}
          <div className="bg-card flex items-center gap-3.5 rounded-[14px] border p-3.5">
            <span
              className={cn(
                'flex size-14 shrink-0 items-center justify-center rounded-2xl transition-colors',
                tint ? cn(tint.bg, tint.text) : 'bg-muted text-muted-foreground',
              )}
            >
              <GroupIcon iconName={fIcon} size="lg" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={cn(
                  'truncate text-base font-bold',
                  canCreate ? 'text-foreground' : 'text-muted-foreground/60',
                )}
              >
                {fName.trim() || t('groups.mobile.previewNamePlaceholder')}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {fDesc.trim() ||
                  (fSide
                    ? t(`sides.${fSide}` as 'sides.bride' | 'sides.groom')
                    : t('groups.mobile.previewNoSideNoDescription'))}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-center">
              <span className="text-muted-foreground/50 text-[17px] leading-none font-bold">0</span>
              <span className="text-muted-foreground text-[10px]">
                {t('groups.mobile.guestsLabel')}
              </span>
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs font-semibold" htmlFor="group-name">
              {t('groups.dialog.nameLabel')}
            </label>
            <Input
              id="group-name"
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              placeholder={t('groups.mobile.namePlaceholder')}
              className="h-12"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs font-semibold" htmlFor="group-desc">
              {t('groups.dialog.descriptionLabel')}
            </label>
            <Input
              id="group-desc"
              value={fDesc}
              onChange={(e) => setFDesc(e.target.value)}
              placeholder={t('groups.mobile.descriptionPlaceholder')}
              className="h-12"
            />
          </div>

          {/* Side */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-xs font-semibold">
                {t('groups.dialog.sideLabel')}
              </span>
              {fSide && (
                <button
                  type="button"
                  onClick={() => setFSide(null)}
                  className="text-primary text-xs font-medium"
                >
                  {t('groups.mobile.noSide')}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {GROUP_SIDES.map((side) => {
                const active = fSide === side;
                const sideTint = SIDE_TINT[side];
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setFSide(active ? null : side)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border-[1.5px] p-3 text-start transition-colors',
                      active ? cn(sideTint.bg, 'border-current', sideTint.text) : 'border-border',
                    )}
                  >
                    <span className={cn('size-2.5 shrink-0 rounded-full', sideTint.dot)} />
                    <span
                      className={cn(
                        'flex-1 truncate text-sm font-semibold',
                        active ? sideTint.text : 'text-foreground',
                      )}
                    >
                      {t(`sides.${side}` as 'sides.bride' | 'sides.groom')}
                    </span>
                    {active && <IconCheck size={14} className={sideTint.text} />}
                  </button>
                );
              })}
            </div>
            <span className="text-muted-foreground text-[11px]">{t('groups.mobile.sideHint')}</span>
          </div>

          {/* Icon */}
          <div className="flex flex-col gap-2">
            <label className="text-muted-foreground text-xs font-semibold">
              {t('groups.dialog.iconLabel')}
            </label>
            <div className="grid grid-cols-6 gap-2">
              {GROUP_ICONS.map((iconName) => {
                const active = fIcon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setFIcon(iconName)}
                    className={cn(
                      'flex h-12 items-center justify-center rounded-xl border-[1.5px] transition-colors',
                      active
                        ? tint
                          ? cn(tint.bg, tint.text, 'border-current')
                          : 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    <GroupIcon iconName={iconName} size="lg" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-col gap-2 border-t px-4 py-4">
          <Button className="h-[50px]" disabled={!canCreate} onClick={handleCreate}>
            {t('groups.dialog.create')}
          </Button>
          <Button
            variant="ghost"
            className="text-primary h-10"
            disabled={!canCreate}
            onClick={handleCreateAndAssign}
          >
            {t('groups.mobile.createAndAssign')}
            {isRTL ? <IconArrowLeft size={16} /> : <IconArrowRight size={16} />}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
