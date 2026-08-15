'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GuestsEstimate } from '@/features/events/schemas';


function StatCard({
  label,
  value,
  sub,
  children,
}: {
  label: string;
  value: string | number;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold tabular-nums leading-none text-foreground">{value}</p>
        {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
        {children}
      </CardContent>
    </Card>
  );
}

export function DaysToEventCard({
  daysRemaining,
}: {
  /** Null when the event has no date - there is nothing to count down to. */
  daysRemaining: number | null;
}) {
  const t = useTranslations('dashboard.stats');

  // An em-dash-free placeholder rather than a zero: zero would read as "the
  // event is today", which is the one thing we know it is not.
  if (daysRemaining === null) {
    return <StatCard label={t('daysToEvent')} value="-" sub={t('noDateYet')} />;
  }

  const isToday = daysRemaining === 0;
  const isPast = daysRemaining < 0;

  const value = isToday ? '🎉' : Math.abs(daysRemaining).toString();
  const sub = isToday ? t('todayIsTheDay') : isPast ? t('daysSince') : t('daysTo');

  return <StatCard label={t('daysToEvent')} value={value} sub={sub} />;
}

export function GuestsInvitedCard({
  total,
  estimate,
}: {
  total: number;
  estimate?: GuestsEstimate;
}) {
  const t = useTranslations('dashboard.stats');
  // The estimate is now the number the owner chose on the slider, so it is both
  // the bar's ceiling and the figure shown - no bucket to widen into a range.
  const pct = estimate ? Math.min(100, Math.round((total / estimate) * 100)) : null;

  return (
    <StatCard
      label={t('guestsInvited')}
      value={total}
      sub={
        estimate
          ? t('ofEstimated', { estimate: estimate.toLocaleString() })
          : undefined
      }
    >
      {pct !== null && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t('pctOfEstimate', { pct })}</p>
        </div>
      )}
    </StatCard>
  );
}

export function ScheduledMessagesCard({
  count,
}: {
  count: number;
}) {
  const t = useTranslations('dashboard.stats');
  return (
    <StatCard
      label={t('scheduledMessages')}
      value={count}
      sub={count === 1 ? t('pendingMessageSingular') : t('pendingMessages')}
    />
  );
}
