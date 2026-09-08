'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { GiftProviderStatus } from '../types';

const STYLES: Record<GiftProviderStatus, string> = {
  off: 'bg-muted text-muted-foreground',
  connected:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  incomplete:
    'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  error: 'bg-destructive/10 text-destructive',
};

const DOT: Record<GiftProviderStatus, string> = {
  off: 'bg-muted-foreground/50',
  connected: 'bg-emerald-500',
  incomplete: 'bg-amber-500',
  error: 'bg-destructive',
};

export function ConnectionBadge({ status }: { status: GiftProviderStatus }) {
  const t = useTranslations('gifting.badge');
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        STYLES[status],
      )}
    >
      <span className={cn('size-1.5 rounded-full', DOT[status])} />
      {t(status)}
    </span>
  );
}
