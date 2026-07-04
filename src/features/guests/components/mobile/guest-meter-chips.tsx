'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { GuestWithGroupApp } from '@/features/guests/schemas';
import { cn } from '@/lib/utils';

interface GuestMeterChipsProps {
  guests: GuestWithGroupApp[];
  selectedStatuses: string[];
  onStatusClick: (status: string | null) => void;
}

type ChipStatus = 'pending' | 'confirmed' | 'declined';

const CHIP_CONFIG: { status: ChipStatus; dot: string; bar: string }[] = [
  { status: 'pending', dot: 'bg-yellow-500', bar: 'bg-yellow-500' },
  { status: 'confirmed', dot: 'bg-green-500', bar: 'bg-green-500' },
  { status: 'declined', dot: 'bg-red-500', bar: 'bg-red-500' },
];

export function GuestMeterChips({
  guests,
  selectedStatuses,
  onStatusClick,
}: GuestMeterChipsProps) {
  const t = useTranslations('guests');

  const counts = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter((g) => g.rsvpStatus === 'confirmed').length;
    const pending = guests.filter((g) => g.rsvpStatus === 'pending').length;
    const declined = guests.filter((g) => g.rsvpStatus === 'declined').length;
    return { total, confirmed, pending, declined };
  }, [guests]);

  if (counts.total === 0) return null;

  const pct = (n: number) => (counts.total > 0 ? (n / counts.total) * 100 : 0);
  const isAllActive = selectedStatuses.length === 0;

  const chipLabel: Record<ChipStatus, string> = {
    pending: t('stats.pending'),
    confirmed: t('stats.confirmed'),
    declined: t('stats.declined'),
  };
  const chipCount: Record<ChipStatus, number> = {
    pending: counts.pending,
    confirmed: counts.confirmed,
    declined: counts.declined,
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Count + stacked-bar meter */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="flex items-baseline gap-1">
            <span className="text-lg font-bold">{counts.total.toLocaleString()}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {t('stats.guestsLabel')}
            </span>
          </span>
          <span className="text-sm font-normal text-foreground">
            {Math.round(pct(counts.confirmed))}% {t('stats.confirmed')}
          </span>
        </div>
        <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full">
          {CHIP_CONFIG.map(({ status, bar }) => {
            const width = pct(chipCount[status]);
            if (width === 0) return null;
            return (
              <div
                key={status}
                className={bar}
                style={{ width: `${width}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Status chips (double as the status filter) */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onStatusClick(null)}
          className={cn(
            'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
            isAllActive
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:bg-accent',
          )}
        >
          {t('stats.all')}
          <span className="tabular-nums">{counts.total}</span>
        </button>
        {CHIP_CONFIG.map(({ status, dot }) => {
          const isActive = selectedStatuses.includes(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => onStatusClick(status)}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent',
              )}
            >
              <span className={cn('size-2 rounded-full', dot)} />
              {chipLabel[status]}
              <span className="tabular-nums">{chipCount[status]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
