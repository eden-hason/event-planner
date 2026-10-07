'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VISITOR_DROPPED_COOKIE } from '../utils/visitor';

/**
 * Said once, to someone who started an event without an account and then
 * signed in to one they already had: the new event was not saved (ADR 0028).
 *
 * The server leaves a short-lived cookie when it forgets the Visitor; the
 * dialog reads it and clears it straight away, so a reload never shows it
 * twice. `place` picks the wording - Home for an Owner with an event to land
 * on, the takeover for an account that has none yet.
 */
export function VisitorDroppedDialog({ place }: { place: 'home' | 'start' }) {
  const t = useTranslations('auth.visitorDropped');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const flagged = document.cookie
      .split('; ')
      .some((c) => c === `${VISITOR_DROPPED_COOKIE}=1`);
    if (!flagged) return;
    document.cookie = `${VISITOR_DROPPED_COOKIE}=; Max-Age=0; Path=/`;
    setOpen(true);
  }, []);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {place === 'home' ? t('bodyHome') : t('bodyStart')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>{t('ok')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
