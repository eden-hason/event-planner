'use client';

import { IconSparkles } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { useBillingSheet } from './use-billing-sheet';

/**
 * The bar stuck to the bottom of an open Schedule: whatever action the
 * Schedule has, and the one sentence that says what to expect.
 *
 * `aboveNav` is for a pane that keeps the phone's bottom nav: the bar then
 * sticks above the nav instead of behind it, and leaves the safe-area padding
 * to the nav that already carries it.
 *
 * `upgrade` adds the one action a locked Schedule has - opening the plan sheet,
 * for the Owner who would pay. Children are the Schedule's own action, if it
 * has one (Save on a message, nothing on a call round).
 */
export function ScheduleFooter({
  note,
  upgrade = false,
  aboveNav = false,
  children,
}: {
  note: string;
  upgrade?: boolean;
  aboveNav?: boolean;
  children?: React.ReactNode;
}) {
  const t = useTranslations('schedules.detail');
  const { canPrompt, openSheet, sheet } = useBillingSheet();

  return (
    <div
      className={cn(
        'bg-card sticky z-10 -mx-4 flex flex-col gap-1.5 border-t px-4 pt-3 md:bottom-0 md:mx-0 md:px-0 md:pb-3',
        aboveNav
          ? 'bottom-[calc(var(--app-bottom-nav-height)+env(safe-area-inset-bottom))] pb-3'
          : 'bottom-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]',
      )}
    >
      {children}
      {upgrade && canPrompt && (
        <Button
          type="button"
          onClick={openSheet}
          className="h-[50px] w-full rounded-xl text-base font-bold"
        >
          <IconSparkles stroke={2.2} />
          {t('upgrade')}
        </Button>
      )}
      <p className="text-muted-foreground text-center text-xs leading-relaxed">{note}</p>
      {sheet}
    </div>
  );
}
