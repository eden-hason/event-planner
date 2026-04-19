'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { IconCalendarClock, IconCalendarEvent } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { cardHover } from '@/lib/utils';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { updateScheduledDate } from '../actions';
import type { ScheduleApp } from '../schemas';

interface ScheduleDetailsCardProps {
  schedule: ScheduleApp | undefined;
  eventDate: string;
}

/**
 * Computes the number of days between two dates (eventDate - scheduledDate),
 * ignoring time components.
 */
function computeDaysBefore(eventDate: string, scheduledDate: string): number {
  const event = new Date(eventDate);
  const scheduled = new Date(scheduledDate);
  // Use UTC dates to avoid timezone issues
  const eventDay = Date.UTC(event.getFullYear(), event.getMonth(), event.getDate());
  const scheduledDay = Date.UTC(
    scheduled.getFullYear(),
    scheduled.getMonth(),
    scheduled.getDate(),
  );
  return Math.round((eventDay - scheduledDay) / (1000 * 60 * 60 * 24));
}

export function ScheduleDetailsCard({
  schedule,
  eventDate,
}: ScheduleDetailsCardProps) {
  const t = useTranslations('schedules.timing');
  const [isSaving, startSaveTransition] = useTransition();

  const [savedDate, setSavedDate] = useState(schedule?.scheduledDate ?? '');
  const [scheduledDate, setScheduledDate] = useState(schedule?.scheduledDate ?? '');

  const daysBeforeEvent = useMemo(() => {
    if (!eventDate || !scheduledDate) return 0;
    return computeDaysBefore(eventDate, scheduledDate);
  }, [eventDate, scheduledDate]);

  const resolvedDateDisplay = useMemo(() => {
    if (!scheduledDate) return '';
    return new Date(scheduledDate).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [scheduledDate]);

  const isDirty = scheduledDate !== savedDate;

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (isNaN(parsed) || !eventDate) return;

    const event = new Date(eventDate);
    const newDate = new Date(event);
    newDate.setDate(event.getDate() - parsed);

    // Preserve the time from the current scheduledDate
    if (scheduledDate) {
      const existing = new Date(scheduledDate);
      newDate.setHours(existing.getHours(), existing.getMinutes(), existing.getSeconds());
    }

    setScheduledDate(newDate.toISOString());
  };

  const handleSave = () => {
    if (!schedule || !isDirty) return;

    startSaveTransition(async () => {
      const promise = updateScheduledDate(schedule.id, scheduledDate).then((result) => {
        if (!result.success)
          throw new Error(result.message ?? 'Failed to update scheduled date.');
        return result;
      });

      toast.promise(promise, {
        loading: t('toast.updating'),
        success: (data) => data.message ?? t('toast.updated'),
        error: (err) => (err instanceof Error ? err.message : t('toast.error')),
      });

      try {
        await promise;
        setSavedDate(scheduledDate);
      } catch {
        // error toast handled above
      }
    });
  };

  if (!schedule || !eventDate) return null;

  return (
    <Card className={cardHover}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <IconCalendarClock size={16} className="text-primary" />
          </div>
          {t('cardTitle')}
        </CardTitle>
        <CardAction className={isDirty ? undefined : 'invisible'}>
          <Button onClick={handleSave} disabled={isSaving || !isDirty} size="sm">
            {isSaving ? t('saving') : t('save')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-xs text-muted-foreground tracking-wide">
              {t('daysBeforeEvent')}
            </Label>
            <div className="relative mt-1">
              <Input
                type="number"
                value={daysBeforeEvent}
                onChange={handleDaysChange}
                className="pr-12 rtl:pr-3 rtl:pl-12"
                disabled={isSaving}
              />
              <span className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                {t('days')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('daysHelper')}</p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground tracking-wide">
              {t('scheduledDate')}
            </Label>
            <div className="flex items-center gap-2 mt-1 rounded-md border bg-muted/50 px-3 py-2 text-sm">
              <IconCalendarEvent size={16} className="text-muted-foreground shrink-0" />
              <span>{resolvedDateDisplay}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('scheduledDateHelper')}</p>
          </div>
        </div>
      </CardContent>

    </Card>
  );
}
