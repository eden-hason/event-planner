'use client';

import { IconSparkles } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

import { usePlansHref } from '@/features/billing';

/**
 * The bar stuck to the bottom of a Schedule the Owner cannot edit: the one
 * sentence that says what to expect, and the way to unlock it when there is one.
 * An editable message has ScheduleSaveBar instead.
 *
 * It sticks above the phone's bottom nav rather than behind it, and leaves the
 * safe-area padding to the nav that already carries it.
 *
 * `upgrade` adds the one action a locked Schedule has - the way to the plans
 * page, for the Owner who would pay. Phone only: from md up the bar is hidden.
 */
export function ScheduleFooter({
  note,
  upgrade = false,
}: {
  note: string;
  upgrade?: boolean;
}) {
  const t = useTranslations('schedules.detail');
  const plansHref = usePlansHref();

  return (
    <div
      className={cn(
        'bg-card md:bg-app-shell sticky bottom-[calc(var(--app-bottom-nav-height)+env(safe-area-inset-bottom))] z-10 -mx-4 flex flex-col gap-1.5 border-t px-4 py-3 md:bottom-0 md:mx-0 md:px-0',
        // A locked Schedule's bar is only the upgrade and its line. At md the
        // upgrade banner above the timeline stays in view, so the bar goes.
        upgrade && 'md:hidden',
      )}
    >
      {upgrade && plansHref && (
        <Button asChild className="w-full rounded-xl text-base font-bold">
          <Link href={plansHref}>
            <IconSparkles stroke={2.2} />
            {t('upgrade')}
          </Link>
        </Button>
      )}
      <p className="text-muted-foreground text-center text-xs leading-relaxed">{note}</p>
    </div>
  );
}
