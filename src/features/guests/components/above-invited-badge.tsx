'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Marks a Guest Record whose answer is above what the Owner invited (ADR 0023).
 * The Guest is never shown the invited amount, so this is where the Owner
 * notices it. Changing the record's count re-invites and clears it.
 */
export function AboveInvitedBadge({
  amount,
  invitedAmount,
  className,
}: {
  amount: number;
  invitedAmount: number | undefined;
  className?: string;
}) {
  const t = useTranslations('guests');
  if (invitedAmount === undefined || amount <= invitedAmount) return null;
  return (
    <Badge
      variant="outline"
      title={t('table.aboveInvitedHint')}
      className={cn(
        'border-amber-500/50 bg-amber-50 font-normal text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
        className,
      )}
    >
      {t('table.aboveInvited', { count: invitedAmount })}
    </Badge>
  );
}
