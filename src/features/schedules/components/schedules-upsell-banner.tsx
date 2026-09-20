'use client';

import { useTranslations } from 'next-intl';
import { IconSparkles } from '@tabler/icons-react';

import { useBillingSheet } from './use-billing-sheet';

/**
 * The one upsell on a locked timeline.
 *
 * Both actions open `EventBillingStatusSheet` - the single place the plan is
 * explained, and the only place a real call to action exists, since checkout
 * is a WhatsApp conversation rather than a payment button. Two buttons rather
 * than one because they answer different questions ("how do I start" and
 * "what do I get"), but they lead to the same page of the same sheet.
 *
 * Owner-only and silent until the provider supplies a status, matching
 * `EventBillingStatusPill`.
 */
export function SchedulesUpsellBanner() {
  const t = useTranslations('schedules.upsell');
  const { canPrompt, openSheet, sheet } = useBillingSheet();

  if (!canPrompt) return null;

  return (
    <>
      <div className="from-primary to-primary/80 text-primary-foreground flex flex-col gap-3 rounded-2xl bg-linear-150 p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="bg-primary-foreground/15 flex size-10 shrink-0 items-center justify-center rounded-xl"
          >
            <IconSparkles className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-base leading-tight font-bold">{t('title')}</p>
            <p className="text-primary-foreground/80 text-[13px] leading-relaxed">
              {t('description')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSheet}
            className="bg-primary-foreground text-primary h-11 flex-1 rounded-xl text-[15px] font-bold transition-opacity active:opacity-90"
          >
            {t('cta')}
          </button>
          <button
            type="button"
            onClick={openSheet}
            className="border-primary-foreground/30 h-11 rounded-xl border px-4 text-[13.5px] font-medium transition-opacity active:opacity-90"
          >
            {t('learnMore')}
          </button>
        </div>
      </div>

      {sheet}
    </>
  );
}
