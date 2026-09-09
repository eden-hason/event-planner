'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Clock, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaboration } from '@/components/feature-layout';
import { useEventBillingStatus } from './event-billing-status-provider';
import { EventBillingStatusSheet } from './event-billing-status-sheet';

/**
 * The "your plan" card on the mobile More page - the standalone surface for
 * "Free to Plan, Pay to Send", one level louder than the header pill.
 *
 * Free (or a lapsed event) gets a solid primary-colour upsell card with a
 * single call to action; a sending event gets a quiet white card that states
 * the plan and offers "manage". Both open the same detail sheet the header
 * pill uses, so there is one place the billing story is told.
 *
 * Owner-only and silent until the provider supplies a status, matching
 * `EventBillingStatusPill`. Renders its own group heading so the More page
 * can drop it in without leaving an empty labelled section when it is hidden.
 */
export function EventPlanCard() {
  const status = useEventBillingStatus();
  const { isOwner } = useCollaboration();
  const t = useTranslations('billing');
  const [open, setOpen] = React.useState(false);

  if (!status || !isOwner) return null;

  const heading = (
    <h2 className="text-muted-foreground px-1.5 text-xs font-medium">
      {t('planCard.group')}
    </h2>
  );

  const badge = (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
        status.tone === 'premium'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
          : 'bg-background text-muted-foreground',
      )}
    >
      {status.tone === 'premium'
        ? t('planCard.active')
        : t(`pill.${status.status}`)}
    </span>
  );

  // Free / canceled: solid primary upsell card, no usage meter.
  if (status.tone === 'plain') {
    return (
      <section className="flex flex-col gap-1.5">
        {heading}
        <div className="bg-primary text-primary-foreground flex flex-col gap-3 rounded-xl p-3.5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="bg-primary-foreground/15 flex size-10 shrink-0 items-center justify-center rounded-[10px]"
            >
              <Crown className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-tight font-semibold">
                {t('planCard.free.title')}
              </p>
              <p className="text-primary-foreground/80 mt-0.5 text-xs">
                {t('planCard.free.description')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-primary-foreground text-primary flex items-center justify-center gap-1.5 rounded-[9px] py-2.5 text-sm font-semibold transition-opacity active:opacity-90"
          >
            {t('planCard.free.cta')}
            <ChevronRight aria-hidden className="size-4 rtl:rotate-180" />
          </button>
        </div>
        <EventBillingStatusSheet
          open={open}
          onOpenChange={setOpen}
          status={status}
        />
      </section>
    );
  }

  const isPending = status.tone === 'pending';

  // Paid / comped / payment_pending: quiet white card that opens the sheet.
  return (
    <section className="flex flex-col gap-1.5">
      {heading}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-card flex w-full items-center gap-3 rounded-xl border p-3.5 text-start transition-colors active:opacity-70"
      >
        <span
          aria-hidden
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-[10px]',
            isPending
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground',
          )}
        >
          {isPending ? (
            <Clock className="size-5" />
          ) : (
            <Crown className="size-5 fill-current" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[15px] leading-tight font-semibold">
              {t(`pill.${status.status}`)}
            </p>
            {badge}
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {isPending
              ? t('planCard.pending.description')
              : t('planCard.paid.description')}
          </p>
        </div>
        <span className="border-border text-foreground/70 shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium">
          {isPending ? t('planCard.details') : t('planCard.manage')}
        </span>
      </button>
      <EventBillingStatusSheet
        open={open}
        onOpenChange={setOpen}
        status={status}
      />
    </section>
  );
}
