'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { GiftProviderStatus } from '../types';

const STYLES: Record<GiftProviderStatus, string> = {
  off: 'bg-muted text-muted-foreground',
  connected:
    'bg-success/10 text-success',
  incomplete:
    'bg-warning/10 text-warning',
  error: 'bg-destructive/10 text-destructive',
};

const DOT: Record<GiftProviderStatus, string> = {
  off: 'bg-muted-foreground/50',
  connected: 'bg-success',
  incomplete: 'bg-warning',
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
