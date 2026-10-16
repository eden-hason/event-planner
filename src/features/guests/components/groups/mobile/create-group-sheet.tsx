'use client';

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
import { GroupWithGuestsApp } from '@/features/guests/schemas';
import { GroupIcon } from '../group-icon';
import { GroupFormFields, useGroupForm } from '../group-form';
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

  const form = useGroupForm(group, open);
  const { isEdit, canSubmit: canCreate } = form;

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) form.reset();
  };

  const assignAfter = !isEdit && form.assignAfter && unassignedCount > 0;

  const handleSubmit = () => {
    if (!canCreate) return;
    const formData = form.buildFormData();
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
              sideTintClass(form.side),
            )}
          >
            <GroupIcon iconName={form.icon} size="lg" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <SheetTitle
                className={cn(
                  'truncate text-[18px] font-extrabold',
                  !canCreate && 'text-muted-foreground',
                )}
              >
                {form.name.trim() || t('groups.mobile.previewNamePlaceholder')}
              </SheetTitle>
              <SideBadge side={form.side} />
            </div>
            <span className="text-muted-foreground text-[12.5px]">
              {isEdit && group
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
          <GroupFormFields form={form} unassignedCount={unassignedCount} />
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
