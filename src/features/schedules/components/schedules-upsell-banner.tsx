'use client';

import { useTranslations } from 'next-intl';
import { Crown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { UPSELL_CTA_CLASS, UPSELL_SURFACE_CLASS } from '@/features/billing';
import { cn } from '@/lib/utils';

import { useBillingSheet } from './use-billing-sheet';

/**
 * The one upsell on a locked timeline.
 *
 * The action opens `EventBillingStatusSheet` - the single place the plan is
 * explained, and the only place a real call to action exists, since checkout
 * is a WhatsApp conversation rather than a payment button.
 *
 * Owner-only and silent until the provider supplies a status, matching
 * `EventBillingStatusPill`.
 */
export function SchedulesUpsellBanner({ count }: { count: number }) {
  const t = useTranslations('schedules.upsell');
  const { canPrompt, openSheet, sheet } = useBillingSheet();

  if (!canPrompt) return null;

  return (
    <>
      <div
        className={cn(
          UPSELL_SURFACE_CLASS,
          'flex flex-col gap-3 rounded-[18px] p-4',
        )}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15"
          >
            <Crown className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-[16.5px] leading-tight font-extrabold">
              {t('title')}
            </p>
            <p className="text-[13px] leading-normal text-white/80">
              {t('description', { count })}
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={openSheet}
          className={cn('font-bold hover:bg-white/90', UPSELL_CTA_CLASS)}
        >
          {t('cta')}
        </Button>
      </div>

      {sheet}
    </>
  );
}
