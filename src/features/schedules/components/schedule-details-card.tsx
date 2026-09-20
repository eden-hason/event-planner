'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import { IconCalendarClock, IconClock, IconLock } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
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
import { offsetDays } from '../utils/timeline';
import type { ScheduleApp } from '../schemas';

/** Used when a schedule has no time yet - the middle of the send window. */
const DEFAULT_SEND_TIME = '10:00';

/**
 * The hours a Due Time may be authored for.
 *
 * The Send Window is 09:00-21:00 Israel and is evaluated at dispatch: a
 * Schedule due outside it is held until the window opens rather than dropped
 * (see utils/send-window.ts). Offering an hour outside it would therefore let
 * the organiser set 08:00, see 08:00 on the card forever, and have the message
 * arrive at 09:00 with nothing anywhere saying why. Whole hours only - the
 * minute a wedding invitation goes out is not a decision worth making.
 */
const SEND_HOURS = Array.from({ length: 12 }, (_, i) =>
  `${String(i + 9).padStart(2, '0')}:00`,
);

interface ScheduleDetailsCardProps {
  schedule: ScheduleApp | undefined;
  eventDate: string | null;
  /** The Event cannot send yet, so nothing here can be moved. */
  locked?: boolean;
}

export function ScheduleDetailsCard({
  schedule,
  eventDate,
  locked,
}: ScheduleDetailsCardProps) {
  const t = useTranslations('schedules.timing');
  const locale = useLocale();
  const [isSaving, startSaveTransition] = useTransition();

  const [savedDate, setSavedDate] = useState(schedule?.scheduledDate ?? '');
  const [scheduledDate, setScheduledDate] = useState(
    schedule?.scheduledDate ?? '',
  );

  // Read back out of the Due Time rather than stored beside it: there is one
  // instant now, and the clock face is a view of it (ADR 0015).
  const [scheduledTime, setScheduledTime] = useState(() =>
    schedule?.scheduledDate
      ? israelWallClockParts(schedule.scheduledDate).time
      : '',
  );

  const daysBeforeEvent = useMemo(
    () => (scheduledDate ? offsetDays(eventDate, scheduledDate) : null),
    [eventDate, scheduledDate],
  );

  // The Israel calendar day of the Due Time, as a Date the picker can show.
  // Built from the wall-clock parts rather than from `new Date(iso)` so a Due
  // Time just after midnight Israel is not shown as the previous day.
  const pickerDate = useMemo(() => {
    if (!scheduledDate) return undefined;
    const { date } = israelWallClockParts(scheduledDate);
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [scheduledDate]);

  // Dispatched counts as locked. The messages are rendered and queued by then,
  // so moving the Due Time would change nothing except what the page claims -
  // and a Schedule is no longer marked 'sent' as a unit (ADR 0013), which makes
  // dispatched_at the fact to read.
  const isLocked =
    Boolean(locked) ||
    schedule?.status === 'sent' ||
    schedule?.status === 'cancelled' ||
    schedule?.status === 'expired' ||
    schedule?.status === 'disabled' ||
    schedule?.dispatchedAt != null;
  const isDirty = !isLocked && scheduledDate !== savedDate;

  // Both handlers rebuild the instant from an Israel calendar date and an
  // Israel wall clock, which is the only way to author a Due Time. Setting UTC
  // hours here is what made "10:00" mean 13:00 in Israel on every schedule this
  // card ever saved.
  const handleDateChange = (next: Date | undefined) => {
    if (!next) return;
    const day = [
      next.getFullYear(),
      String(next.getMonth() + 1).padStart(2, '0'),
      String(next.getDate()).padStart(2, '0'),
    ].join('-');
    const iso = israelWallClockToIso(day, scheduledTime || DEFAULT_SEND_TIME);
    if (iso) setScheduledDate(iso);
  };

  const handleTimeChange = (value: string) => {
    const day = israelWallClockParts(
      scheduledDate || eventDate || new Date().toISOString(),
    ).date;
    const iso = israelWallClockToIso(day, value);
    if (!iso) return;
    setScheduledDate(iso);
    setScheduledTime(value);
  };

  const handleSave = () => {
    if (!schedule || !isDirty) return;

    startSaveTransition(async () => {
      const promise = updateScheduledDate(schedule.id, scheduledDate).then(
        (result) => {
          if (!result.success)
            throw new Error(result.message ?? 'Failed to update scheduled date.');
          return result;
        },
      );

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

  const relativeNote =
    daysBeforeEvent === null
      ? null
      : daysBeforeEvent === 0
        ? t('relative.dayOf')
        : daysBeforeEvent < 0
          ? t('relative.before', { count: Math.abs(daysBeforeEvent) })
          : t('relative.after', { count: daysBeforeEvent });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-md p-1.5">
            <IconCalendarClock size={16} className="text-primary" />
          </div>
          {t('cardTitle')}
        </CardTitle>
        <CardAction>
          {locked ? (
            <span className="bg-warning/10 text-warning inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold">
              <IconLock size={11} stroke={2.2} />
              {t('lockedBadge')}
            </span>
          ) : (
            <Button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              size="sm"
              className={isDirty ? undefined : 'invisible'}
            >
              {isSaving ? t('saving') : t('save')}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.4fr_1fr]">
            <div>
              <Label className="text-muted-foreground text-xs tracking-wide">
                {t('scheduledDate')}
              </Label>
              <div className="mt-1">
                <DatePicker
                  date={pickerDate}
                  onDateChange={handleDateChange}
                  disabled={isSaving || isLocked}
                  placeholder={t('scheduledDate')}
                />
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs tracking-wide">
                {t('scheduledTime')}
              </Label>
              <Select
                value={scheduledTime}
                onValueChange={handleTimeChange}
                disabled={isSaving || isLocked}
                // Radix infers direction from the DOM on the client and not on
                // the server, which hydrates an RTL page with a mismatched
                // trigger. Stating it fixes both renders to the same value.
                dir={locale === 'he' ? 'rtl' : 'ltr'}
              >
                <SelectTrigger className="mt-1 w-full">
                  <IconClock size={16} className="text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEND_HOURS.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                  {/* A Due Time authored before this card restricted the hours
                      would otherwise vanish from its own select. */}
                  {scheduledTime && !SEND_HOURS.includes(scheduledTime) && (
                    <SelectItem value={scheduledTime}>{scheduledTime}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            {relativeNote}
            {relativeNote ? ' · ' : ''}
            {t('sendWindowHelper', {
              start: SEND_HOURS[0],
              end: SEND_HOURS.at(-1) as string,
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
