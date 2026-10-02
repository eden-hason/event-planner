'use client';

import { useTranslations } from 'next-intl';
import { IconCircleCheckFilled } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The import validate step's "needs fixing" tab once nothing does: a success
 * state in place of an empty list, with a way over to the valid rows. Shared
 * by the desktop dialog (`compact`, inside a short scroll box) and the mobile
 * wizard (full height).
 */
export function ImportAllValidState({
  count,
  onReview,
  compact = false,
}: {
  count: number;
  onReview: () => void;
  compact?: boolean;
}) {
  const t = useTranslations('guests.import.validate');

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1 px-6 text-center',
        compact ? 'bg-success/5 py-10' : 'flex-1 py-16',
      )}
    >
      <span
        className={cn(
          'bg-success/15 ring-success/5 flex items-center justify-center rounded-full ring-8',
          compact ? 'size-12' : 'size-16',
        )}
      >
        <IconCircleCheckFilled
          size={compact ? 28 : 36}
          className="text-success"
        />
      </span>
      <p
        className={cn(
          'text-success font-semibold',
          compact ? 'mt-3 text-sm' : 'mt-4 text-base',
        )}
      >
        {t('emptyNeedsFix', { count })}
      </p>
      <p
        className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}
      >
        {t('emptyNeedsFixSub')}
      </p>
      <Button
        variant="outline"
        size="sm"
        className={compact ? 'mt-3' : 'mt-4'}
        onClick={onReview}
      >
        {t('emptyNeedsFixAction')}
      </Button>
    </div>
  );
}
