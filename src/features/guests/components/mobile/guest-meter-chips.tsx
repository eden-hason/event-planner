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

type ChipStatus = 'confirmed' | 'pending' | 'declined';

const BAR_ORDER: ChipStatus[] = ['confirmed', 'pending', 'declined'];

const DOT_CLASS: Record<ChipStatus | 'all', string> = {
  all: 'bg-muted-foreground/50',
  confirmed: 'bg-green-500',
  pending: 'bg-yellow-500',
  declined: 'bg-red-500',
};

const BAR_CLASS: Record<ChipStatus, string> = {
  confirmed: 'bg-green-500',
  pending: 'bg-yellow-500',
  declined: 'bg-red-500',
};

export function GuestMeterChips({
  guests,
  selectedStatuses,
  onStatusClick,
}: GuestMeterChipsProps) {
  const t = useTranslations('guests');

  // Counts are in guests (the sum of every record's amount), matching the
  // desktop stat cards. The record count rides along as the secondary number.
  const counts = useMemo(() => {
    const guestCount = (rows: GuestWithGroupApp[]) =>
      rows.reduce((s, g) => s + g.amount, 0);
    const byStatus = (status: string) =>
      guestCount(guests.filter((g) => g.rsvpStatus === status));

    return {
      total: guestCount(guests),
      totalRecords: guests.length,
      confirmed: byStatus('confirmed'),
      pending: byStatus('pending'),
      declined: byStatus('declined'),
    };
  }, [guests]);

  if (guests.length === 0) return null;

  const pct = (n: number) => (counts.total > 0 ? (n / counts.total) * 100 : 0);
  const isAllActive = selectedStatuses.length === 0;

  const tiles: { key: ChipStatus | 'all'; label: string; count: number }[] = [
    { key: 'all', label: t('stats.all'), count: counts.total },
    { key: 'confirmed', label: t('stats.confirmed'), count: counts.confirmed },
    { key: 'pending', label: t('stats.pending'), count: counts.pending },
    { key: 'declined', label: t('stats.declined'), count: counts.declined },
  ];

  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      {/* Title + confirmed headline */}
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{t('stats.rsvpStatus')}</span>
        <span className="text-muted-foreground text-sm">
          <b className="text-foreground text-base">
            {Math.round(pct(counts.confirmed))}%
          </b>{' '}
          {t('stats.confirmed')}
        </span>
      </div>

      {/* Stacked-bar meter */}
      <div className="bg-muted flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
        {BAR_ORDER.map((status) => {
          const width = pct(counts[status]);
          if (width === 0) return null;
          return (
            <div
              key={status}
              className={BAR_CLASS[status]}
              style={{ width: `${width}%` }}
            />
          );
        })}
      </div>

      {/* Totals line */}
      <span className="text-muted-foreground text-xs">
        {counts.total.toLocaleString()} {t('stats.guestsLabel')} ·{' '}
        {t('stats.records', { count: counts.totalRecords.toLocaleString() })}
      </span>

      {/* Status tiles (double as the status filter) */}
      <div className="grid grid-cols-4 gap-1.5">
        {tiles.map(({ key, label, count }) => {
          const isActive =
            key === 'all' ? isAllActive : selectedStatuses.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onStatusClick(key === 'all' ? null : key)}
              className={cn(
                'flex min-h-[3.75rem] flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 transition-colors',
                isActive
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border bg-background hover:bg-accent',
              )}
            >
              <span className="text-muted-foreground flex items-center gap-1 text-[11px] whitespace-nowrap">
                <span
                  className={cn('size-1.5 shrink-0 rounded-full', DOT_CLASS[key])}
                />
                {label}
              </span>
              <span
                className={cn(
                  'text-base font-bold tabular-nums',
                  isActive ? 'text-primary' : 'text-foreground',
                )}
              >
                {count.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
