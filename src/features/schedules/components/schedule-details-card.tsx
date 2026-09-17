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
import { israelWallClockParts, israelWallClockToIso } from '@/lib/date-time';
import type { ScheduleApp } from '../schemas';

/** Used when a schedule has no time yet - the middle of the send window. */
const DEFAULT_SEND_TIME = '10:00';

interface ScheduleDetailsCardProps {
  schedule: ScheduleApp | undefined;
  eventDate: string | null;
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

  // Read back out of the Due Time rather than stored beside it: there is one
  // instant now, and the clock face is a view of it (ADR 0015).
  const [scheduledTime, setScheduledTime] = useState(() =>
    schedule?.scheduledDate ? israelWallClockParts(schedule.scheduledDate).time : '',
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

  // Both handlers rebuild the instant from an Israel calendar date and an
  // Israel wall clock, which is the only way to author a Due Time. Setting UTC
  // hours here is what made "10:00" mean 13:00 in Israel on every schedule this
  // card ever saved.
  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (isNaN(parsed) || !eventDate) return;

    const event = new Date(eventDate);
    const newDay = new Date(event);
    newDay.setUTCDate(event.getUTCDate() - parsed);

    const iso = israelWallClockToIso(
      newDay.toISOString().slice(0, 10),
      scheduledTime || DEFAULT_SEND_TIME,
    );
    if (iso) setScheduledDate(iso);
  };

  const handleTimeChange = (value: string) => {
    // The card returns null without an event date, so the last fallback is
    // unreachable; it is here because this runs before that guard.
    const day = israelWallClockParts(scheduledDate || eventDate || new Date().toISOString()).date;
    const iso = israelWallClockToIso(day, value);
    if (!iso) return;
    setScheduledDate(iso);
    setScheduledTime(value);
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
        success: () => t('toast.updated'),
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
              <div className="bg-muted/50 mt-1 flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <IconCalendarEvent size={16} className="text-muted-foreground shrink-0" />
                <span className="truncate">{resolvedDateDisplay}</span>
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
