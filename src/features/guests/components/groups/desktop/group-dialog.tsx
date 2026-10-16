'use client';

import { useLocale, useTranslations } from 'next-intl';
import { IconX } from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GroupWithGuestsApp } from '@/features/guests/schemas';
import { cn } from '@/lib/utils';
import { GroupIcon } from '../group-icon';
import { GroupFormFields, useGroupForm } from '../group-form';
import { SideBadge, sideTintClass } from '../../side-badge';

/**
 * Desktop's create/edit group dialog - the phone's bottom sheet as a centred
 * window, on the same form. With `preassignCount` the new group is being made
 * for records picked in the Unassigned view, so they join it on create and the
 * "assign right away" switch has nothing to decide.
 */
export function GroupDialog({
  open,
  onOpenChange,
  group,
  unassignedCount,
  preassignCount = 0,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set to edit this group; null creates one. */
  group: GroupWithGuestsApp | null;
  unassignedCount: number;
  preassignCount?: number;
  /** `openAfter`: select the new group in the list so it can be filled. */
  onSubmit: (formData: FormData, options: { openAfter: boolean }) => void;
}) {
  const t = useTranslations('guests');
  const tCommon = useTranslations('common');
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';
  const form = useGroupForm(group, open);
  const { isEdit, canSubmit } = form;

  const close = () => {
    onOpenChange(false);
    form.reset();
  };

  const switchShown = !isEdit && preassignCount === 0 && unassignedCount > 0;
  const openAfter = switchShown && form.assignAfter;

  const submit = () => {
    if (!canSubmit) return;
    const formData = form.buildFormData();
    close();
    onSubmit(formData, { openAfter });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        dir={dir}
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-[18px] p-0 sm:max-w-[560px]"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex items-center gap-3 border-b px-5 py-[18px]">
            <span
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors',
                sideTintClass(form.side),
              )}
            >
              <GroupIcon iconName={form.icon} size="md" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <div className="flex min-w-0 items-center gap-1.5">
                <DialogTitle
                  className={cn(
                    'truncate text-[19px] leading-tight font-extrabold',
                    !canSubmit && 'text-muted-foreground',
                  )}
                >
                  {form.name.trim() || t('groups.mobile.previewNamePlaceholder')}
                </DialogTitle>
                <SideBadge side={form.side} />
              </div>
              <DialogDescription className="text-[12.5px]">
                {isEdit && group
                  ? t('groups.mobile.editSubtitle', { count: group.guestCount })
                  : preassignCount > 0
                    ? t('groups.desktop.newGroupForRecords', {
                        count: preassignCount,
                      })
                    : t('groups.mobile.newGroupSubtitle')}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={tCommon('close')}
              className="bg-muted text-muted-foreground flex size-[34px] shrink-0 items-center justify-center rounded-[9px]"
            >
              <IconX size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-4 px-5 py-[18px]">
            <GroupFormFields
              form={form}
              wide
              unassignedCount={switchShown ? unassignedCount : 0}
            />
          </div>

          <div className="flex justify-end gap-2 border-t px-5 py-3.5">
            <Button type="button" variant="outline" onClick={close}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit} className="font-bold">
              {isEdit
                ? t('groups.mobile.saveButton')
                : openAfter || preassignCount > 0
                  ? t('groups.mobile.createAndAssignCta')
                  : t('groups.mobile.createButton')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
