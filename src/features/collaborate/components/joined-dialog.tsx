'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconConfetti } from '@tabler/icons-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { JOINED_COOKIE } from '../utils';

/**
 * Said once, to a co-planner who has just joined through the Co-planner Link
 * (ADR 0041), so they know they are in and the Event is now theirs too. The
 * join leaves a short-lived cookie; the dialog reads it and clears it straight
 * away, so a reload never shows it twice.
 */
export function JoinedDialog() {
  const t = useTranslations('collaborate.joined');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const flagged = document.cookie
      .split('; ')
      .some((c) => c === `${JOINED_COOKIE}=1`);
    if (!flagged) return;
    document.cookie = `${JOINED_COOKIE}=; Max-Age=0; Path=/`;
    setOpen(true);
  }, []);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="bg-primary/10 text-primary mx-auto mb-2 flex size-14 items-center justify-center rounded-full sm:mx-0">
            <IconConfetti className="size-7" />
          </div>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('body')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>{t('ok')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
