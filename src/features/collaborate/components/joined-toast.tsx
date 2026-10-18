'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { usePathname, useRouter } from '@/i18n/navigation';
import { JOINED_PARAM } from '../utils';

/**
 * Said once, to a co-planner who has just joined through the Co-planner Link
 * (ADR 0041), so they know they are in and the Event is now theirs too. The
 * join page sends them to Home with `?joined=1`; the flag is dropped from the
 * URL straight away, so a reload never shows it twice.
 */
export function JoinedToast() {
  const t = useTranslations('collaborate.joined');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get(JOINED_PARAM) !== '1') return;
    setOpen(true);
    const rest = new URLSearchParams(searchParams);
    rest.delete(JOINED_PARAM);
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

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
