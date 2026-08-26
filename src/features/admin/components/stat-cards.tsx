import { CalendarDays, CircleCheck, ListChecks, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OverviewStats } from '../types';

/**
 * The headline of the Overview: four stat cards the Operator reads first. Every
 * number carries its unit and a supporting sub-line - "guest records" is the
 * billable unit and is a different quantity from the number of guests.
 */
type StatCard = {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  /** Confirmed reads as an outcome, so it takes the success tint; the rest the brand. */
  tone: 'brand' | 'success';
};

function integer(value: number): string {
  return value.toLocaleString('en-GB');
}

export function StatCards({ stats }: { stats: OverviewStats }) {
  // Null, not zero: with no guest records there is no rate, and "0%" would read
  // as a failing campaign rather than as "no lists yet".
  const rate =
    stats.guestRecords > 0
      ? Math.round((stats.confirmed / stats.guestRecords) * 100)
      : null;

  const perEvent =
    stats.events > 0 ? Math.round(stats.guestRecords / stats.events) : 0;

  const cards: StatCard[] = [
    {
      label: 'Users',
      value: integer(stats.users),
      sub: `${integer(stats.usersJoinedThisWeek)} joined this week`,
      icon: Users,
      tone: 'brand',
    },
    {
      label: 'Events',
      value: integer(stats.events),
      sub: `${integer(stats.eventsUpcoming)} in the next 30 days`,
      icon: CalendarDays,
      tone: 'brand',
    },
    {
      label: 'Guest records',
      value: integer(stats.guestRecords),
      sub: `${integer(perEvent)} average per event`,
      icon: ListChecks,
      tone: 'brand',
    },
    {
      label: 'Confirmed',
      value: rate === null ? '-' : `${rate}%`,
      sub:
        rate === null
          ? 'No guest lists yet'
          : `${integer(stats.confirmed)} of ${integer(stats.guestRecords)} guests`,
      icon: CircleCheck,
      tone: 'success',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-lg',
                card.tone === 'success'
                  ? 'bg-success/10 text-success'
                  : 'bg-primary/10 text-primary',
              )}
            >
              <card.icon className="size-4" aria-hidden />
            </span>
            <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {card.label}
            </span>
          </div>

          <div className="text-3xl font-bold tracking-tight tabular-nums">
            {card.value}
          </div>

          <div className="text-muted-foreground text-[13px] tabular-nums">
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatCardsError() {
  return (
    <div className="text-destructive text-sm">Stats didn&apos;t load</div>
  );
}

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="bg-accent size-7 shrink-0 animate-pulse rounded-lg" />
            <div className="bg-accent h-2.5 w-20 animate-pulse rounded-sm" />
          </div>
          <div className="bg-accent h-8 w-16 animate-pulse rounded-md" />
          <div className="bg-accent h-3 w-28 animate-pulse rounded-md" />
        </div>
      ))}
    </div>
  );
}
