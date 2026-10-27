import { BadgeCheck, CalendarDays, CreditCard, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OverviewStats } from '../types';

/**
 * The headline of the Overview: four stat cards the Operator reads first. Every
 * number carries a supporting sub-line. Paid Events counts Events and Payments
 * sums what was paid, so an Event that tops up adds money but not an event.
 */
type StatCard = {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  /** Paid Events reads as an outcome, so it takes the success tint; the rest the brand. */
  tone: 'brand' | 'success';
};

function integer(value: number): string {
  return value.toLocaleString('he-IL');
}

/** Whole shekels: agorot are noise at this altitude. */
function shekels(value: number): string {
  return `₪${Math.round(value).toLocaleString('he-IL')}`;
}

export function StatCards({ stats }: { stats: OverviewStats }) {
  const cards: StatCard[] = [
    {
      label: 'משתמשים',
      value: integer(stats.users),
      sub: `${integer(stats.usersJoinedThisWeek)} הצטרפו השבוע`,
      icon: Users,
      tone: 'brand',
    },
    {
      label: 'אירועים',
      value: integer(stats.events),
      sub: `${integer(stats.eventsUpcoming)} ב-30 הימים הקרובים`,
      icon: CalendarDays,
      tone: 'brand',
    },
    {
      label: 'אירועים ששולמו',
      value: integer(stats.paidEvents),
      sub: `${integer(stats.paidEventsThisMonth)} שילמו החודש`,
      icon: BadgeCheck,
      tone: 'success',
    },
    {
      label: 'תשלומים',
      value: shekels(stats.paymentsTotal),
      sub: `${shekels(stats.paymentsTotalThisMonth)} החודש`,
      icon: CreditCard,
      tone: 'brand',
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
    <div className="text-destructive text-sm">הנתונים לא נטענו</div>
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
