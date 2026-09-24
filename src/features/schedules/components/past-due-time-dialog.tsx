'use client';

import { IconClockExclamation } from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';

import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type { ScheduleApp } from '../schemas';
import { useScheduleSettings } from './schedule-settings-context';

interface PastDueTimeDialogProps {
  targetStatus: ScheduleApp['targetStatus'];
  /** Size of the target audience as it stands today. */
  audienceCount: number | null;
  sendWindow: { start: string; end: string };
}

/**
 * Asked at Save when the edited Due Time has already passed (backlog 0014).
 *
 * A past Due Time is not an error - sending now is a legitimate thing to want -
 * but the page used to say nothing, so "today 10:00" picked at 16:00 went to 99
 * guests at 16:14 while still reading 10:00. This says what will really
 * happen, which is not always "now": outside the Send Window the Dispatcher
 * holds it until the window opens, and the dialog names that moment instead of
 * promising something the Dispatcher will not do.
 */
export function PastDueTimeDialog({
  targetStatus,
  audienceCount,
  sendWindow,
}: PastDueTimeDialogProps) {
  const t = useTranslations('schedules');
  const locale = useLocale();
  const { pendingPastDueTime, scheduledTime, confirmPastDueTime, cancelPastDueTime } =
    useScheduleSettings();

  const audienceLabel =
    targetStatus === 'confirmed'
      ? t('audience.confirmedGuests')
      : targetStatus === 'pending'
        ? t('audience.pendingGuests')
        : t('audience.allGuests');

  const description =
    pendingPastDueTime?.kind === 'heldUntil'
      ? t('pastDueDialog.heldUntil', {
          start: sendWindow.start,
          end: sendWindow.end,
          when: new Intl.DateTimeFormat(locale, {
            timeZone: ADMIN_TIME_ZONE,
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
          }).format(new Date(pendingPastDueTime.opensAt)),
        })
      : t('pastDueDialog.sendsNow', { time: scheduledTime });

  return (
    <AlertDialog
      open={pendingPastDueTime !== null}
      onOpenChange={(open) => {
        if (!open) cancelPastDueTime();
      }}
    >
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <IconClockExclamation size={18} className="text-warning-ink shrink-0" />
            {t('pastDueDialog.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="bg-muted/40 flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('sendDialog.whoWillReceive')}</span>
            <span className="bg-background rounded-md border px-2 py-0.5 text-xs font-medium">
              {audienceLabel}
            </span>
          </div>
          {audienceCount !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('sendDialog.recipients')}</span>
              <span className="bg-background rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums">
                {t('sendDialog.guestCount', { count: audienceCount })}
              </span>
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('pastDueDialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={confirmPastDueTime}>
            {t('pastDueDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
