'use client';

import { Info } from 'lucide-react';
import { useSeatingCopy } from './use-seating-copy';

interface ScopeBannerProps {
  scopedRecordCount: number;
}

/**
 * Sets a Seating Manager's expectations before they hit the boundary: every
 * Table is visible and its occupancy is truthful, but only their own Guest
 * Records can be identified or moved (ADR-0008).
 */
export function ScopeBanner({ scopedRecordCount }: ScopeBannerProps) {
  const { t } = useSeatingCopy();

  return (
    <div className="bg-muted/60 border-border flex items-start gap-2.5 rounded-xl border px-4 py-3">
      <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <p className="text-sm">
        <span className="font-medium">{t('scope.bannerTitle')}</span>{' '}
        <span className="text-muted-foreground">
          {t('scope.bannerBody', { count: scopedRecordCount })}
        </span>
      </p>
    </div>
  );
}
