import { getLocale, getTranslations } from 'next-intl/server';
import { IconCalendarEvent, IconClock, IconPhone } from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TargetAudienceCard } from '@/features/schedules/components/target-audience-card';

interface CallPlanCardProps {
  /** The planned call date, ISO 8601 */
  scheduledDate: string;
  /** HH:MM, or null when the plan predates the time column */
  scheduledTime: string | null;
  targetStatus?: 'pending' | 'confirmed' | null;
  /** The event date, used to show how far ahead the calling sits */
  eventDate: string;
  cancelled: boolean;
}

function dayOffset(scheduledDate: string, eventDate: string): number {
  const event = new Date(eventDate);
  event.setHours(0, 0, 0, 0);
  const planned = new Date(scheduledDate);
  planned.setHours(0, 0, 0, 0);
  return Math.round((planned.getTime() - event.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * A phone call round that has been planned but not yet started.
 *
 * Read-only by design: the Owner picks the date once in the setup wizard and
 * the plan then belongs to the back office, which is enforced by a restrictive
 * RLS policy on `schedules` rather than by hiding controls. This is deliberately
 * a separate component from `ScheduleTabContent` - the cards that one composes
 * exist to be editable and carry the mutation actions with them, so a
 * purpose-built card is smaller than threading `readOnly` through all of them.
 * See docs/adr/0004-call-schedules-are-plans-call-rounds-are-executions.md.
 */
export async function CallPlanCard({
  scheduledDate,
  scheduledTime,
  targetStatus,
  eventDate,
  cancelled,
}: CallPlanCardProps) {
  const t = await getTranslations('calls.plan');
  const tSchedules = await getTranslations('schedules');
  // This renders on the server, so a bare toLocaleDateString() would format in
  // the *server's* locale - m/d/yyyy - whatever the Owner is reading the app in.
  const locale = await getLocale();

  const offset = dayOffset(scheduledDate, eventDate);
  const offsetLabel =
    offset === 0
      ? tSchedules('dayOffset.onEventDay')
      : offset < 0
        ? tSchedules('dayOffset.daysBefore')
        : tSchedules('dayOffset.daysAfter');

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Card className={cn(cancelled && 'opacity-60')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="bg-primary/10 rounded-md p-1.5">
                <IconPhone size={16} className="text-primary" />
              </div>
              {t('title')}
            </CardTitle>
            <CardDescription>
              {cancelled ? t('cancelledDescription') : t('description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <IconCalendarEvent size={16} className="text-muted-foreground shrink-0" />
              <span className="font-medium">
                {new Date(scheduledDate).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <Badge variant="secondary" className="gap-1 rounded-sm text-xs">
                {Math.abs(offset)}
              </Badge>
              <span className="text-muted-foreground text-xs">{offsetLabel}</span>
            </div>
            {scheduledTime && (
              <div className="flex items-center gap-2 text-sm">
                <IconClock size={16} className="text-muted-foreground shrink-0" />
                <span className="font-medium">{scheduledTime.slice(0, 5)}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <TargetAudienceCard targetStatus={targetStatus} disabled={cancelled} />
      </div>
    </div>
  );
}
