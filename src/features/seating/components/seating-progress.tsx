'use client';

import { cn } from '@/lib/utils';
import type { SeatingProgressView } from '../types';
import { readyPercent } from '../utils/occupancy';
import { useSeatingCopy } from './use-seating-copy';

interface SeatingProgressProps {
  progress: SeatingProgressView;
  variant?: 'desktop' | 'mobile';
}

/**
 * Readiness, counted in Guest Records (ADR-0009).
 *
 * The headline is confirmed records seated over confirmed records. Unseated
 * pending records sit beside it as their own line and are never folded in -
 * collapsing the two would tell a couple their plan is incomplete because a
 * cousin has not replied yet.
 */
export function SeatingProgress({ progress, variant = 'desktop' }: SeatingProgressProps) {
  const { t } = useSeatingCopy();
  const percent = readyPercent(progress);

  const confirmedWidth = progress.confirmedRecordsTotal === 0 ? 0 : percent;

  if (variant === 'mobile') {
    return (
      <div className="bg-card border-border rounded-xl border p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">{percent}%</span>
          <span className="text-muted-foreground text-sm">{t('progress.ready')}</span>
        </div>
        <div className="bg-muted mt-3 h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-rsvp-confirmed h-full transition-[width]"
            style={{ width: `${confirmedWidth}%` }}
          />
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          {t('progress.mobileLine', {
            confirmed:
              progress.confirmedGuestsTotal - progress.confirmedGuestsSeated,
            pending: progress.pendingGuestsUnseated,
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border-border flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border px-5 py-4">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">{percent}%</span>
        <span className="text-muted-foreground text-sm">{t('progress.ready')}</span>
      </div>

      <div className="min-w-56 flex-1">
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-rsvp-confirmed h-full transition-[width]"
            style={{ width: `${confirmedWidth}%` }}
          />
        </div>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="bg-rsvp-confirmed size-2 rounded-full" />
            {t('progress.confirmedLine', {
              seated: progress.confirmedGuestsSeated,
              total: progress.confirmedGuestsTotal,
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-rsvp-pending size-2 rounded-full" />
            {t('progress.pendingLine', { count: progress.pendingGuestsUnseated })}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-muted-foreground/40 size-2 rounded-full" />
            {t('progress.capacityLine', {
              used: progress.seatedHeads,
              total: progress.totalCapacity,
            })}
          </span>
        </div>
      </div>

      <span
        className={cn(
          'rounded-full px-3 py-1 text-xs font-medium',
          progress.isComplete
            ? 'bg-rsvp-confirmed/15 text-rsvp-confirmed'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {progress.isComplete ? t('progress.complete') : t('progress.inProgress')}
      </span>
    </div>
  );
}
