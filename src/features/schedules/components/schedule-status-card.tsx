'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { IconActivity, IconPower } from '@tabler/icons-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/alert';
import { Switch } from '@/components/ui/toggle-switch';

import { updateScheduleStatus } from '../actions';
import type { ScheduleApp } from '../schemas';

interface ScheduleStatusCardProps {
  schedule: ScheduleApp;
  /**
   * The Event cannot send yet, so this Schedule was seeded 'disabled' and the
   * organiser has no switch to throw - paying enables the whole set at once.
   */
  locked?: boolean;
}

export function ScheduleStatusCard({
  schedule,
  locked,
}: ScheduleStatusCardProps) {
  const t = useTranslations('schedules.status');
  const [isPending, startTransition] = useTransition();

  const key = schedule.status ?? 'pending';
  const isSent = schedule.status === 'sent';
  // A seeded-but-never-enabled Schedule is not "off" - nobody turned it off.
  // It reads as locked and the switch is inert, because the thing that turns
  // it on is paying, not this control.
  const isEnabled = schedule.status !== 'cancelled' && !locked;

  const handleToggle = (enabled: boolean) => {
    startTransition(async () => {
      const promise = updateScheduleStatus(schedule.id, enabled).then((result) => {
        if (!result.success) throw new Error(result.message ?? 'Failed to update status.');
        return result;
      });

      toast.promise(promise, {
        loading: t('toast.updating'),
        success: () => t(enabled ? 'toast.enabled' : 'toast.disabled'),
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
        <p className="text-muted-foreground text-sm">
          {t(`description.${locked ? 'disabled' : key}`)}
        </p>
        {!isSent && !locked && (
          <div className="mt-4">
            <Alert variant={isEnabled ? 'success' : 'default'}>
              <IconPower strokeWidth={2.2} />
              <AlertTitle>
                {t(isEnabled ? 'toggle.enabled' : 'toggle.disabled')}
              </AlertTitle>
              <AlertDescription>
                {t(isEnabled ? 'toggle.enabledDescription' : 'toggle.disabledDescription')}
              </AlertDescription>
              <AlertAction>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={handleToggle}
                  disabled={isPending || locked}
                />
              </AlertAction>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
