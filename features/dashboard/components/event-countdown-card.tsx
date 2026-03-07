import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cardHover } from '@/lib/utils';
import { IconCalendar, IconMapPin } from '@tabler/icons-react';
import type { EventApp } from '@/features/events/schemas';

function getDaysRemaining(eventDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(eventDate);
  event.setHours(0, 0, 0, 0);
  return Math.ceil((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
  const daysRemaining = getDaysRemaining(event.eventDate);
  const isPast = daysRemaining < 0;
  const isToday = daysRemaining === 0;

  return (
    <Card className={`h-full overflow-hidden ${cardHover}`}>
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
            {isToday ? 'Today is the day!' : isPast ? 'days since the event' : 'days to go'}
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
