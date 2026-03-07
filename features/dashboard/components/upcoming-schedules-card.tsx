import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cardHover } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { IconBrandWhatsapp, IconMessage, IconCalendarPlus } from '@tabler/icons-react';
import { ACTION_TYPE_LABELS, type ScheduleApp } from '@/features/schedules/schemas';

function formatScheduleDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function UpcomingSchedulesCard({
  schedules,
  eventId,
}: {
  schedules: ScheduleApp[];
  eventId: string;
}) {
  const upcoming = schedules
    .filter((s) => !s.status)
    .slice(0, 3);

  return (
    <Card className={`flex flex-col ${cardHover}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Upcoming Schedules</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
            <IconCalendarPlus className="h-8 w-8 opacity-40" />
            <p>No upcoming schedules</p>
            <Link
              href={`/app/${eventId}/schedules`}
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </div>
        ) : (
          upcoming.map((schedule) => (
            <div key={schedule.id} className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 shrink-0 text-muted-foreground">
                {schedule.deliveryMethod === 'whatsapp' ? (
                  <IconBrandWhatsapp className="h-4 w-4" />
                ) : (
                  <IconMessage className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {ACTION_TYPE_LABELS[schedule.actionType]}
                  </Badge>
                  {schedule.targetStatus && (
                    <span className="text-xs text-muted-foreground capitalize">→ {schedule.targetStatus}</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatScheduleDate(schedule.scheduledDate)}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
      {upcoming.length > 0 && (
        <CardFooter className="pt-2">
          <Link
            href={`/app/${eventId}/schedules`}
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            View all schedules →
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
