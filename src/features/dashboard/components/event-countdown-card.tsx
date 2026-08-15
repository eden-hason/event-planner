'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconCalendar, IconMapPin } from '@tabler/icons-react';
import type { EventApp } from '@/features/events/schemas';

function getDaysRemaining(eventDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(eventDate);
  event.setHours(0, 0, 0, 0);
  return Math.ceil((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * The card for an event whose owner has not picked a date yet.
 *
 * A permanent, legitimate state, not a gap to be filled in later - so it says
 * what is true rather than showing a zero or an empty slot where the countdown
 * would be.
 */
function NoDateCountdown({ event }: { event: EventApp }) {
  const t = useTranslations('dashboard.countdown');

  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="flex h-full flex-col justify-between p-6">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl leading-tight font-semibold">{event.title}</h2>
          <Badge variant={statusVariant[event.status] ?? 'secondary'} className="shrink-0 capitalize">
            {event.status}
          </Badge>
        </div>

        <div className="py-4 text-center">
          <p className="text-2xl leading-tight font-semibold text-balance">
            {t('noDateTitle')}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            {t('noDateDescription')}
          </p>
        </div>

        <div className="text-muted-foreground space-y-2 text-sm">
          {event.location?.name && (
            <div className="flex items-center gap-2">
              <IconMapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{event.location.name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
};

export function EventCountdownCard({ event }: { event: EventApp }) {
  const t = useTranslations('dashboard.countdown');

  if (!event.eventDate) return <NoDateCountdown event={event} />;

  const daysRemaining = getDaysRemaining(event.eventDate);
  const isPast = daysRemaining < 0;
  const isToday = daysRemaining === 0;

  return (
    <Card className={"h-full overflow-hidden"}>
      <CardContent className="flex h-full flex-col justify-between p-6">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-semibold leading-tight">{event.title}</h2>
            <Badge variant={statusVariant[event.status] ?? 'secondary'} className="shrink-0 capitalize">
              {event.status}
            </Badge>
          </div>
        </div>

        <div className="py-4 text-center">
          <p className="text-7xl font-bold tabular-nums leading-none">
            {isPast ? Math.abs(daysRemaining) : daysRemaining}
          </p>
          <p className="mt-2 text-lg text-muted-foreground">
            {isToday ? t('today') : isPast ? t('daysSince') : t('daysTo')}
          </p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <IconCalendar className="h-4 w-4 shrink-0" />
            <span>{formatEventDate(event.eventDate)}</span>
          </div>
          {event.location?.name && (
            <div className="flex items-center gap-2">
              <IconMapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{event.location.name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
