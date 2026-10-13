'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from '@/components/icons';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Band, BandRow, Surface } from './band';
import type { CallRoundStatus, OverviewCallRound, OverviewCallRounds } from '../types';
import { cn } from '@/lib/utils';

const TITLE = 'סבבי שיחות';

const STATUS_LABELS: Record<CallRoundStatus, string> = {
  planned: 'מתוכנן',
  in_progress: 'בתהליך',
  completed: 'הושלם',
};

/** What the click does, in the event timeline's own words. */
const ACTION_LABELS: Record<CallRoundStatus, string> = {
  planned: 'התחלת הסבב',
  in_progress: 'המשך הסבב',
  completed: 'פתיחת הסבב',
};

/**
 * The call rounds of one day, today by default. Every day in the window comes
 * down with the page, so switching days is instant and the server alone
 * decides which Israel calendar day a round belongs to.
 */
export function CallRounds({ days, rounds }: OverviewCallRounds) {
  const [selected, setSelected] = useState(days[0]?.key ?? '');
  const day = days.find((option) => option.key === selected) ?? days[0];
  const shown = rounds.filter((round) => round.day === selected);

  return (
    <Band title={TITLE}>
      <div className="overflow-x-auto px-4 pb-3">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label="היום שסבבי השיחות שלו מוצגים"
          className="bg-card"
          value={selected}
          // Radix sends '' when the pressed item is clicked again; the day stays picked instead.
          onValueChange={(next) => next && setSelected(next)}
        >
          {days.map((option) => {
            const count = rounds.filter((round) => round.day === option.key).length;
            return (
              <ToggleGroupItem
                key={option.key}
                value={option.key}
                title={option.fullLabel}
                className="gap-1.5 px-3 text-[12.5px]"
              >
                {option.label}
                {count > 0 && (
                  <span className="text-muted-foreground tabular-nums">{count}</span>
                )}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      {shown.length === 0 ? (
        <BandRow className="text-muted-foreground flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-[18px] text-[13.5px]">
          <span>אין סבבי שיחות {day?.phrase}</span>
          <Link
            href="/admin/operations"
            className="hover:text-foreground text-[13px] font-medium transition-colors"
          >
            כל העבודה המתוכננת בתפעול ←
          </Link>
        </BandRow>
      ) : (
        shown.map((round) => <CallRoundRow key={round.id} round={round} />)
      )}
    </Band>
  );
}

function CallRoundRow({ round }: { round: OverviewCallRound }) {
  return (
    <Link
      href={round.href}
      className="hover:bg-accent focus-visible:ring-ring flex items-center gap-4 border-t px-4 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span
        className={cn(
          'w-11 shrink-0 text-[13px] tabular-nums',
          round.late ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {round.scheduledTime}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{round.eventTitle}</span>
        <span className="text-muted-foreground truncate text-[12.5px]">
          {round.title} · {round.detail}
          {round.late ? ', לא התחיל' : ''}
        </span>
      </span>

      <span
        className={cn(
          'shrink-0 rounded-full border px-2 py-px text-[10px] font-semibold',
          round.status === 'in_progress'
            ? 'border-primary/40 text-primary'
            : 'text-muted-foreground',
        )}
      >
        {STATUS_LABELS[round.status]}
      </span>

      <span
        className={cn(
          'hidden shrink-0 items-center gap-0.5 text-[13px] font-medium sm:flex',
          round.status === 'completed' && 'text-muted-foreground',
        )}
      >
        {ACTION_LABELS[round.status]}
        <ChevronLeft className="size-3.5" />
      </span>
    </Link>
  );
}

/** Must not read as an empty day: a failed read is not "no rounds". */
export function CallRoundsError() {
  return (
    <Band title={TITLE}>
      <BandRow className="text-destructive text-[13.5px]">סבבי השיחות לא נטענו</BandRow>
    </Band>
  );
}

export function CallRoundsSkeleton() {
  return (
    <Surface as="section">
      <div className="px-4 pt-4 pb-3">
        <div className="bg-accent h-2.5 w-[96px] animate-pulse rounded-sm" />
      </div>
      <div className="px-4 pb-3">
        <div className="bg-accent h-8 w-full max-w-[520px] animate-pulse rounded-md" />
      </div>
      {[220, 180].map((width) => (
        <div key={width} className="flex items-center gap-4 border-t px-4 py-3.5">
          <div className="bg-accent h-3 w-11 animate-pulse rounded-md" />
          <div
            className="bg-accent h-3 animate-pulse rounded-md"
            style={{ maxWidth: width, flex: 1 }}
          />
          <div className="bg-accent ms-auto h-3 w-14 animate-pulse rounded-md" />
        </div>
      ))}
    </Surface>
  );
}
