'use client';

import { useLocale, useTranslations } from 'next-intl';
import { IconUsers } from '@tabler/icons-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GroupWithGuestsApp } from '@/features/guests/schemas';
import { rsvpPresentation } from '@/features/guests/utils';
import { cn } from '@/lib/utils';

/** Confirm before a group delete: its records stay, they just lose the group. */
export function DeleteGroupDialog({
  group,
  onOpenChange,
  onConfirm,
}: {
  group: GroupWithGuestsApp | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (group: GroupWithGuestsApp) => void;
}) {
  const t = useTranslations('guests.groups.mobile');
  const tCommon = useTranslations('common');
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';

  return (
    <AlertDialog open={group !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent dir={dir} className="gap-3.5 rounded-[18px] sm:max-w-[460px]">
        <AlertDialogHeader className="text-start">
          <AlertDialogTitle className="text-[19px] leading-snug font-extrabold">
            {t('deleteTitle', { name: group?.name ?? '' })}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[14.5px] leading-relaxed text-pretty">
            {t('deleteBody')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {group && group.guestCount > 0 && (
          <div className="text-muted-foreground flex items-center gap-2 text-[14.5px]">
            <span
              className={cn(
                rsvpPresentation('pending').chip,
                'flex size-6 shrink-0 items-center justify-center rounded-[7px]',
              )}
            >
              <IconUsers size={14} stroke={2.2} />
            </span>
            {t('deleteMoves', { count: group.guestCount })}
          </div>
        )}
        <AlertDialogFooter className="mt-1.5">
          <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => group && onConfirm(group)}
          >
            {t('deleteConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Leaving a group whose membership draft is unsaved: keep editing, or throw
 * the draft away and go where the click was heading.
 */
export function DiscardDraftDialog({
  draft,
  onKeepEditing,
  onDiscard,
}: {
  draft: { groupName: string; added: number; removed: number } | null;
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations('guests.groups.desktop');
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';

  return (
    <AlertDialog
      open={draft !== null}
      onOpenChange={(open) => !open && onKeepEditing()}
    >
      <AlertDialogContent dir={dir} className="rounded-[18px] sm:max-w-[440px]">
        <AlertDialogHeader className="text-start">
          <AlertDialogTitle className="text-[19px] font-extrabold">
            {t('discardTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[14.5px] leading-relaxed">
            {t('discardBody', {
              name: draft?.groupName ?? '',
              added: draft?.added ?? 0,
              removed: draft?.removed ?? 0,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('keepEditing')}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDiscard}>
            {t('discardChanges')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
