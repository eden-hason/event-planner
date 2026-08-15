'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { IconSend } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

import { executeSchedule } from '../actions/execute-schedule';
import { type ScheduleApp } from '../schemas';
import posthog from 'posthog-js';

interface SendConfirmDialogProps {
  scheduleId: string;
  guestCount: number;
  targetStatus: ScheduleApp['targetStatus'];
  triggerClassName?: string;
  triggerSize?: 'sm' | 'default';
  disabled?: boolean;
}

export function SendConfirmDialog({
  scheduleId,
  guestCount,
  targetStatus,
  triggerClassName,
  triggerSize = 'default',
  disabled,
}: SendConfirmDialogProps) {
  const t = useTranslations('schedules');
  const [isSending, startSendTransition] = useTransition();

  const audienceLabel =
    targetStatus === 'confirmed'
      ? t('audience.confirmedGuests')
      : targetStatus === 'pending'
        ? t('audience.pendingGuests')
        : t('audience.allGuests');

  const handleSendNow = () => {
    startSendTransition(async () => {
      const promise = executeSchedule(scheduleId).then((result) => {
        if (!result.success) throw new Error(result.message);
        if (
          process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
          process.env.NEXT_PUBLIC_POSTHOG_HOST
        ) {
          posthog.capture('schedule_sent', {
            schedule_id: scheduleId,
            target_status: targetStatus,
            recipient_count: result.summary?.sentCount ?? 0,
          });
        }
        return result;
      });

      toast.promise(promise, {
        loading: t('sendDialog.toast.sending'),
        success: (data) =>
          t('sendDialog.toast.sent', { count: data.summary?.sentCount ?? 0 }),
        error: (err) => (err instanceof Error ? err.message : t('sendDialog.toast.failed')),
      });

      await promise.catch(() => {});
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size={triggerSize}
          disabled={isSending || disabled}
          className={cn('gap-2', triggerClassName)}
        >
          <IconSend size={triggerSize === 'sm' ? 14 : 16} />
          {isSending ? t('sendDialog.sending') : t('sendDialog.sendNow')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <IconSend size={18} />
            {t('sendDialog.title')}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>
          {t('sendDialog.description')}
        </AlertDialogDescription>
        <div className="rounded-lg border bg-muted/40 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('sendDialog.whoWillReceive')}</span>
            <span className="bg-background rounded-md border px-2 py-0.5 text-xs font-medium">
              {audienceLabel}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('sendDialog.recipients')}</span>
            <span className="bg-background rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums">
              {t('sendDialog.guestCount', { count: guestCount })}
            </span>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('sendDialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleSendNow}>{t('sendDialog.confirm')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
