'use client';

import { useTranslations } from 'next-intl';
import { CircleFadingArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCollaboration } from '@/components/feature-layout';
import { Link } from '@/i18n/navigation';
import { useSaveEvent } from '@/features/auth';
import { useEventBillingStatus } from './event-billing-status-provider';

/**
 * The header's way to the plans page while nothing is paid for (Upgrade Button design). It
 * takes the status pill's place until then: the pill says what the Owner has, this says
 * what they can get. Shown to the one who would pay - the Event's creator - and not to a
 * Visitor, whose header offers "Save your event" instead (ADR 0028).
 */
export function UpgradeButton({ href }: { href: React.ComponentProps<typeof Link>['href'] }) {
  const status = useEventBillingStatus();
  const { canSeePayments } = useCollaboration();
  const { isVisitor } = useSaveEvent();
  const t = useTranslations('billing.upgrade');

  if (!status?.canUpgrade || !canSeePayments || isVisitor) return null;

  return (
    <Button asChild size="sm" className="h-9 shrink-0 rounded-full ps-2.5 pe-3.5 md:h-10 md:ps-3.5 md:pe-4">
      <Link href={href}>
        <CircleFadingArrowUp className="size-4" aria-hidden />
        {t('button')}
      </Link>
    </Button>
  );
}
