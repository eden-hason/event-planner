'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { IconActivity, IconPower } from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

import { updateScheduleStatus } from '../actions';
import type { ScheduleApp } from '../schemas';

interface ScheduleStatusCardProps {
  schedule: ScheduleApp;
}

export function ScheduleStatusCard({ schedule }: ScheduleStatusCardProps) {
  const t = useTranslations('schedules.status');
  const [isPending, startTransition] = useTransition();

  const key = schedule.status ?? 'pending';
  const isSent = schedule.status === 'sent';
  const isEnabled = schedule.status !== 'cancelled';

  const handleToggle = (enabled: boolean) => {
    startTransition(async () => {
      const promise = updateScheduleStatus(schedule.id, enabled).then((result) => {
        if (!result.success) throw new Error(result.message ?? 'Failed to update status.');
        return result;
      });

      toast.promise(promise, {
        loading: t('toast.updating'),
        success: (data) => data.message ?? t(enabled ? 'toast.enabled' : 'toast.disabled'),
        error: (err) => (err instanceof Error ? err.message : t('toast.error')),
      });

      try {
        await promise;
      } catch {
        // error toast handled above
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <IconActivity size={16} className="text-primary" />
          </div>
          {t('cardTitle')}
        </CardTitle>

      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{t(`description.${key}`)}</p>
        {!isSent && (
          <div className="mt-4">
            <div
              className={cn(
                'flex items-center gap-3 w-full rounded-lg border px-3 py-2.5 transition-all duration-150',
                isEnabled
                  ? 'bg-green-100 border-green-300'
                  : 'bg-muted/40 border-border',
              )}
            >
              <div
                className={cn(
                  'size-[34px] rounded-lg shrink-0 flex items-center justify-center transition-colors duration-150',
                  isEnabled ? 'bg-green-200' : 'bg-muted',
                )}
              >
                <IconPower
                  size={15}
                  strokeWidth={2.2}
                  className={isEnabled ? 'text-green-700' : 'text-muted-foreground'}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className={cn('text-sm font-medium', isEnabled ? 'text-green-800' : 'text-foreground')}>
                  {t(isEnabled ? 'toggle.enabled' : 'toggle.disabled')}
                </div>
                <div className={cn('text-[11.5px] mt-0.5', isEnabled ? 'text-green-700' : 'text-muted-foreground')}>
                  {t(isEnabled ? 'toggle.enabledDescription' : 'toggle.disabledDescription')}
                </div>
              </div>

              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggle}
                disabled={isPending}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
