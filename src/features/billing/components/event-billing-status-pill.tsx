'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Crown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaboration } from '@/components/feature-layout';
import { useEventBillingStatus } from './event-billing-status-provider';
import { EventBillingStatusSheet } from './event-billing-status-sheet';
import { BILLING_TONE_CLASS } from '../utils';

/**
 * The account-status pill on the header's action side (left in RTL).
 *
 * "Free to Plan, Pay to Send" made visible per event: an outline "Free" chip
 * while planning, a gold "Premium" chip with a crown once sending is unlocked.
 * Tapping it opens the detail sheet.
 *
 * Owner-only - a seating-manager collaborator is not the payer and has no
 * billing decision to make - and silent until the provider supplies a status.
 */
export function EventBillingStatusPill() {
  const status = useEventBillingStatus();
  const { isOwner } = useCollaboration();
  const t = useTranslations('billing');
  const [open, setOpen] = React.useState(false);

  if (!status || !isOwner) return null;

  const showCrown = status.tone === 'premium';
  const showClock = status.tone === 'pending';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('pill.ariaLabel')}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1',
          'text-xs font-semibold transition-colors',
          'hover:brightness-[0.97] active:brightness-95',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
          BILLING_TONE_CLASS[status.tone],
        )}
      >
        <span>{t(`pill.${status.status}`)}</span>
        {showCrown && <Crown className="size-3.5 fill-current" aria-hidden />}
        {showClock && <Clock className="size-3.5" aria-hidden />}
      </button>

      <EventBillingStatusSheet
        open={open}
        onOpenChange={setOpen}
        status={status}
      />
    </>
  );
}
