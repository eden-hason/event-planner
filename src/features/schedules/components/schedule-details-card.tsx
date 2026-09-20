'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import { IconCalendarClock, IconClock } from '@tabler/icons-react';

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
import {
  offsetDays as offsetDaysFrom,
  offsetPhrase,
  sendWindowHours,
} from '../utils/timeline';
import type { ScheduleApp } from '../schemas';

/** Used when a schedule has no time yet - the middle of the send window. */
const DEFAULT_SEND_TIME = '10:00';

interface ScheduleDetailsCardProps {
  schedule: ScheduleApp | undefined;
  eventDate: string | null;
  /** The Event cannot send yet, so nothing here can be moved. */
  locked?: boolean;
  /**
   * The Send Window, read server-side from `sendingConfig()`.
   *
   * The picker offers whole hours inside it because the window is evaluated at
   * dispatch, not at authoring: a Due Time outside it is held until the window
   * opens (utils/send-window.ts). Offering 08:00 would let the organiser set a
   * time, see it on the card forever, and have the message arrive at 09:00 with
   * nothing saying why. Passed in rather than imported so there is one window,
   * the one the Dispatcher actually uses, and not a second copy here.
   */
  sendWindow: { start: string; end: string };
  /** Rendered server-side and passed in - see ScheduleLockBadge. */
  lockBadge?: React.ReactNode;
}

export function ScheduleDetailsCard({
  schedule,
  eventDate,
  locked,
  sendWindow,
  lockBadge,
}: ScheduleDetailsCardProps) {
  const t = useTranslations('schedules.timing');
  const locale = useLocale();
  const hours = useMemo(() => sendWindowHours(sendWindow), [sendWindow]);
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

  const relative = useMemo(
    () => offsetPhrase(scheduledDate ? offsetDaysFrom(eventDate, scheduledDate) : null),
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

  const relativeNote = relative
    ? t(`relative.${relative.key}`, { count: relative.count })
    : null;

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
            lockBadge
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
                  {hours.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                  {/* A Due Time authored before this card restricted the hours,
                      or under a wider window, would otherwise vanish from its
                      own select. */}
                  {scheduledTime && !hours.includes(scheduledTime) && (
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
              start: hours[0] ?? sendWindow.start,
              end: hours.at(-1) ?? sendWindow.start,
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
