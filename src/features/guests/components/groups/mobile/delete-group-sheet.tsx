'use client';

import { useTranslations } from 'next-intl';
import { IconUsers, IconX } from '@tabler/icons-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { GroupWithGuestsApp } from '@/features/guests/schemas';
import { rsvpPresentation } from '@/features/guests/utils';
import { cn } from '@/lib/utils';

interface DeleteGroupSheetProps {
  group: GroupWithGuestsApp | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (group: GroupWithGuestsApp) => void;
}

/** Confirm before a group delete: its records stay, they just lose the group. */
export function DeleteGroupSheet({
  group,
  onOpenChange,
  onConfirm,
}: DeleteGroupSheetProps) {
  const t = useTranslations('guests.groups.mobile');
  const tCommon = useTranslations('common');

  return (
    <Sheet open={group !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex flex-col gap-3.5 rounded-t-[24px] border-0 px-4 pt-5 pb-7 [&_[data-slot=sheet-close]]:hidden"
      >
        <SheetHeader className="flex-row items-start gap-2.5 p-0">
          <SheetTitle className="flex-1 text-[18px] leading-snug font-extrabold">
            {t('deleteTitle', { name: group?.name ?? '' })}
          </SheetTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={tCommon('close')}
            className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-[9px]"
          >
            <IconX size={16} />
          </button>
        </SheetHeader>
        <p className="text-muted-foreground text-[14.5px] leading-relaxed text-pretty">
          {t('deleteBody')}
        </p>
        {group && group.guestCount > 0 && (
          <div className="text-muted-foreground flex items-start gap-2 text-[14.5px] leading-normal">
            <span className={cn(rsvpPresentation('pending').chip, 'flex size-6 shrink-0 items-center justify-center rounded-[7px]')}>
              <IconUsers size={14} stroke={2.2} />
            </span>
            {t('deleteMoves', { count: group.guestCount })}
          </div>
        )}
        <div className="mt-1 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            variant="destructive"
            className="flex-[1.4]"
            onClick={() => group && onConfirm(group)}
          >
            {t('deleteConfirm')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
