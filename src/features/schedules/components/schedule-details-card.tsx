'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import { IconCalendarClock, IconCalendarEvent, IconClock } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const locale = useLocale();
  const [isSaving, startSaveTransition] = useTransition();

  const [savedDate, setSavedDate] = useState(schedule?.scheduledDate ?? '');
  const [scheduledDate, setScheduledDate] = useState(schedule?.scheduledDate ?? '');

  const [scheduledTime, setScheduledTime] = useState(
    schedule?.scheduledTime ? schedule.scheduledTime.slice(0, 5) : '',
  );

  const daysBeforeEvent = useMemo(() => {
    if (!eventDate || !scheduledDate) return 0;
    return computeDaysBefore(eventDate, scheduledDate);
  }, [eventDate, scheduledDate]);

  const resolvedDateDisplay = useMemo(() => {
    if (!scheduledDate) return '';
    return new Date(scheduledDate).toLocaleDateString(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [scheduledDate]);

  const isLocked = schedule?.status === 'sent' || schedule?.status === 'cancelled';
  const isDirty = !isLocked && scheduledDate !== savedDate;

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (isNaN(parsed) || !eventDate) return;

    const event = new Date(eventDate);
    const newDate = new Date(event);
    newDate.setUTCDate(event.getUTCDate() - parsed);

    // Preserve the time from the current scheduledDate
    if (scheduledDate) {
      const existing = new Date(scheduledDate);
      newDate.setUTCHours(existing.getUTCHours(), existing.getUTCMinutes(), existing.getUTCSeconds());
    }

    setScheduledDate(newDate.toISOString());
  };

  const handleTimeChange = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    const newDate = new Date(scheduledDate || eventDate);
    newDate.setUTCHours(hours, minutes, 0, 0);
    setScheduledDate(newDate.toISOString());
    setScheduledTime(value);
  };

  const handleSave = () => {
    if (!schedule || !isDirty) return;

    startSaveTransition(async () => {
      const promise = updateScheduledDate(schedule.id, scheduledDate, scheduledTime).then((result) => {
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
    <Card>
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
        <div className="flex flex-col gap-6">
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
                  disabled={isSaving || isLocked}
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

          <div>
            <Label className="text-xs text-muted-foreground tracking-wide">
              {t('scheduledTime')}
            </Label>
            <Select
              value={scheduledTime}
              onValueChange={handleTimeChange}
              disabled={isSaving || isLocked}
            >
              <SelectTrigger className="mt-1 w-full">
                <IconClock size={16} className="text-muted-foreground shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10:00">10:00</SelectItem>
                <SelectItem value="14:00">14:00</SelectItem>
                <SelectItem value="18:00">18:00</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{t('scheduledTimeHelper')}</p>
          </div>
        </div>
      </CardContent>

    </Card>
  );
}
