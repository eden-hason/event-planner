'use client';

import { useTranslations } from 'next-intl';
import { Crown, Clock } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useSaveEvent } from '@/features/auth';
import { useEventBillingStatus } from './event-billing-status-provider';
import { usePlansHref } from './use-plans-href';
import { BILLING_TONE_CLASS } from '../utils';

/**
 * The account-status pill on the header's action side (left in RTL).
 *
 * "Free to Plan, Pay to Send" made visible per event: an outline "Free" chip
 * while planning, a gold "Premium" chip with a crown once sending is unlocked.
 * Tapping it opens the plans page; for a collaborator, who has no way there, it
 * is only a label.
 *
 * Silent until the provider supplies a status.
 * Not shown to a Visitor either: there is no account to bill until they save,
 * and the header's "Save your event" pill takes its place (ADR 0028). Nor while
 * the Owner can still upgrade: the header's upgrade button stands in for it.
 */
export function EventBillingStatusPill() {
  const status = useEventBillingStatus();
  const { isVisitor } = useSaveEvent();
  const t = useTranslations('billing');
  const href = usePlansHref();

  if (!status || isVisitor || status.canUpgrade) return null;

  const showCrown = status.tone === 'premium';
  const showClock = status.tone === 'pending';

  const className = cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1',
    'text-xs font-semibold',
    href &&
      'transition-colors hover:brightness-[0.97] active:brightness-95 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
    BILLING_TONE_CLASS[status.tone],
  );
  const content = (
    <>
      <span>{t(`pill.${status.status}`)}</span>
      {showCrown && <Crown className="size-3.5 fill-current" aria-hidden />}
      {showClock && <Clock className="size-3.5" aria-hidden />}
    </>
  );

  return href ? (
    <Link href={href} aria-label={t('pill.ariaLabel')} className={className}>
      {content}
    </Link>
  ) : (
    <span aria-label={t('pill.ariaLabel')} className={className}>
      {content}
    </span>
  );
}
