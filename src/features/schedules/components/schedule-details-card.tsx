'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { israelWallClockParts, israelWallClockToIso } from '@/lib/date-time';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  offsetDays as offsetDaysFrom,
  offsetPhrase,
  sendWindowHours,
} from '../utils/timeline';
import { SettingsCard } from './settings-card';
import { useScheduleSettings } from './schedule-settings-context';

/** Used when a schedule has no time yet - the middle of the send window. */
const DEFAULT_SEND_TIME = '10:00';

interface ScheduleDetailsCardProps {
  eventDate: string | null;
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

/** When the message goes out: a date and a whole hour inside the Send Window. */
export function ScheduleDetailsCard({
  eventDate,
  sendWindow,
  lockBadge,
}: ScheduleDetailsCardProps) {
  const t = useTranslations('schedules.timing');
  const locale = useLocale();
  const hours = useMemo(() => sendWindowHours(sendWindow), [sendWindow]);
  const { editable, scheduledDate, setScheduledDate, scheduledTime, setScheduledTime, isSaving } =
    useScheduleSettings();
  const disabled = !editable || isSaving;

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
    const day = israelWallClockParts(scheduledDate || eventDate || new Date().toISOString()).date;
    const iso = israelWallClockToIso(day, value);
    if (!iso) return;
    setScheduledDate(iso);
    setScheduledTime(value);
  };

  if (!scheduledDate || !eventDate) return null;

  const relativeNote = relative ? t(`relative.${relative.key}`, { count: relative.count }) : null;

  return (
    <SettingsCard title={t('cardTitle')} aside={!editable ? lockBadge : undefined}>
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground text-xs font-normal">{t('scheduledDate')}</Label>
          <div
            className={cn(
              '[&_button]:h-[46px] [&_button]:rounded-[11px] [&_button]:text-[14.5px] [&_button]:font-semibold',
              '[&_svg]:text-primary [&_button:disabled_svg]:text-muted-foreground [&_button:disabled]:opacity-100',
              !editable && '[&_button]:bg-muted/60',
            )}
          >
            <DatePicker
              date={pickerDate}
              onDateChange={handleDateChange}
              disabled={disabled}
              placeholder={t('scheduledDate')}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground text-xs font-normal">{t('scheduledTime')}</Label>
          <Select
            value={scheduledTime}
            onValueChange={handleTimeChange}
            disabled={disabled}
            // Radix infers direction from the DOM on the client and not on
            // the server, which hydrates an RTL page with a mismatched
            // trigger. Stating it fixes both renders to the same value.
            dir={locale === 'he' ? 'rtl' : 'ltr'}
          >
            <SelectTrigger
              className={cn(
                // `data-[size=default]:h-9` on the trigger outranks a plain `h-*`, so the
                // height has to be stated against the same variant.
                'data-[size=default]:h-[46px] w-full rounded-[11px] text-[14.5px] font-semibold',
                'disabled:opacity-100',
                !editable && 'bg-muted/60',
              )}
            >
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
    </SettingsCard>
  );
}
