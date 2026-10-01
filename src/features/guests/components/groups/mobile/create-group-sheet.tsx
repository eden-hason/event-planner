'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconX } from '@tabler/icons-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/toggle-switch';
import {
  GROUP_ICONS,
  GROUP_SIDES,
  GroupSide,
  GroupWithGuestsApp,
} from '@/features/guests/schemas';
import { GroupIcon } from '../group-icon';
import { cn } from '@/lib/utils';
import { SideBadge, sideTintClass } from '../../side-badge';

interface CreateGroupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGroup: (formData: FormData) => void;
  onCreateAndAssign: (formData: FormData) => void;
  /** Guest records with no group; the assign-right-away switch only shows when above zero. */
  unassignedCount: number;
  /** When set the sheet edits this group instead of creating one. */
  group?: GroupWithGuestsApp | null;
  onUpdateGroup?: (formData: FormData) => void;
}

export function CreateGroupSheet({
  open,
  onOpenChange,
  onCreateGroup,
  onCreateAndAssign,
  unassignedCount,
  group = null,
  onUpdateGroup,
}: CreateGroupSheetProps) {
  const t = useTranslations('guests');
  const tCommon = useTranslations('common');

  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fSide, setFSide] = useState<GroupSide | null>(null);
  const [fAssign, setFAssign] = useState(true);
  const [fIcon, setFIcon] = useState<(typeof GROUP_ICONS)[number]>('IconUsers');

  const isEdit = group !== null;

  // Seed the form from the group being edited each time the sheet opens on one.
  useEffect(() => {
    if (!open || !group) return;
    setFName(group.name);
    setFDesc(group.description ?? '');
    setFSide(group.side);
    setFIcon((group.icon as (typeof GROUP_ICONS)[number]) ?? 'IconUsers');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group?.id]);

  const canCreate = fName.trim().length > 0;

  const reset = () => {
    setFName('');
    setFDesc('');
    setFSide(null);
    setFIcon('IconUsers');
    setFAssign(true);
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append('name', fName.trim());
    formData.append('icon', fIcon);
    if (isEdit) {
      // An edit must be able to clear these, so they are always sent: an
      // empty value is read as "none" by the action.
      formData.append('id', group.id);
      formData.append('description', fDesc.trim());
      formData.append('side', fSide ?? '');
    } else {
      if (fDesc.trim()) formData.append('description', fDesc.trim());
      if (fSide) formData.append('side', fSide);
    }
    return formData;
  };

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) reset();
  };

  const assignAfter = !isEdit && fAssign && unassignedCount > 0;

  const handleSubmit = () => {
    if (!canCreate) return;
    const formData = buildFormData();
    handleClose(false);
    if (isEdit) onUpdateGroup?.(formData);
    else if (assignAfter) onCreateAndAssign(formData);
    else onCreateGroup(formData);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="flex h-[92dvh] flex-col gap-0 overflow-clip rounded-t-[24px] border-0 p-0 data-[state=closed]:duration-200 data-[state=open]:duration-200 [&_[data-slot=sheet-close]]:hidden"
      >
        <SheetHeader className="flex-row items-center gap-3 border-b px-4 pt-5 pb-3.5">
          <span
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors',
              sideTintClass(fSide),
            )}
          >
            <GroupIcon iconName={fIcon} size="lg" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <SheetTitle
                className={cn(
                  'truncate text-[18px] font-extrabold',
                  !canCreate && 'text-muted-foreground',
                )}
              >
                {fName.trim() || t('groups.mobile.previewNamePlaceholder')}
              </SheetTitle>
              <SideBadge side={fSide} />
            </div>
            <span className="text-muted-foreground text-[12.5px]">
              {isEdit
                ? t('groups.mobile.editSubtitle', { count: group.guestCount })
                : t('groups.mobile.newGroupSubtitle')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-[9px]"
            aria-label={tCommon('close')}
          >
            <IconX size={16} />
          </button>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-3.5">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-muted-foreground text-xs font-semibold"
              htmlFor="group-name"
            >
              {t('groups.dialog.nameLabel')}
            </label>
            <Input
              id="group-name"
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              placeholder={t('groups.mobile.namePlaceholder')}
              className="h-[42px] text-[15px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-muted-foreground text-xs font-semibold"
              htmlFor="group-desc"
            >
              {t('groups.dialog.descriptionLabel')}
            </label>
            <Input
              id="group-desc"
              value={fDesc}
              onChange={(e) => setFDesc(e.target.value)}
              placeholder={t('groups.mobile.descriptionPlaceholder')}
              className="h-[42px] text-[15px]"
            />
          </div>

          {/* Side: one segmented control, "no side" is a real option */}
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-semibold">
              {t('groups.dialog.sideLabel')}
            </span>
            <div className="bg-muted flex h-[42px] gap-0.5 rounded-[11px] p-[3px]">
              {([...GROUP_SIDES, null] as const).map((side) => {
                const active = fSide === side;
                return (
                  <button
                    key={side ?? 'none'}
                    type="button"
                    onClick={() => setFSide(side)}
                    className={cn(
                      'flex flex-1 items-center justify-center rounded-lg text-[13.5px] transition-colors',
                      active
                        ? 'bg-card text-foreground font-bold shadow-sm'
                        : 'text-muted-foreground font-medium',
                    )}
                  >
                    {side ? t(`list.sides.${side}`) : t('groups.mobile.noSide')}
                  </button>
                );
              })}
            </div>
            <span className="text-muted-foreground text-xs leading-normal">
              {t('groups.mobile.sideHint')}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs font-semibold">
              {t('groups.dialog.iconLabel')}
            </label>
            <div className="grid grid-cols-6 gap-[7px]">
              {GROUP_ICONS.map((iconName) => {
                const active = fIcon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setFIcon(iconName)}
                    className={cn(
                      'flex h-[46px] items-center justify-center rounded-[11px] border-[1.5px] transition-colors',
                      active
                        ? fSide
                          ? cn(sideTintClass(fSide), 'border-current')
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

          {!isEdit && unassignedCount > 0 && (
            <div className="flex min-h-[50px] items-center gap-3 border-t pt-1.5">
              <label
                htmlFor="assign-right-away"
                className="flex min-w-0 flex-1 cursor-pointer flex-col gap-px"
              >
                <span className="text-[15px] font-medium">
                  {t('groups.mobile.assignRightAway')}
                </span>
                <span className="text-muted-foreground text-[12.5px]">
                  {t('groups.mobile.stillUnassigned', {
                    count: unassignedCount,
                  })}
                </span>
              </label>
              <Switch
                id="assign-right-away"
                switchSize="lg"
                checked={fAssign}
                onCheckedChange={setFAssign}
              />
            </div>
          )}
        </div>

        <SheetFooter className="flex-row gap-2 border-t px-4 pt-2.5 pb-7">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleClose(false)}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            className="flex-[1.4]"
            disabled={!canCreate}
            onClick={handleSubmit}
          >
            {isEdit
              ? t('groups.mobile.saveButton')
              : assignAfter
                ? t('groups.mobile.createAndAssignCta')
                : t('groups.mobile.createButton')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
