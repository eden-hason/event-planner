'use client';

import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

import { updateScheduleStatus } from '../actions';
import type { ScheduleApp, ScheduleStatus } from '../schemas';

interface ScheduleStatusCardProps {
  schedule: ScheduleApp;
}

const STATUS_CONFIG: Record<
  ScheduleStatus,
  { description: string; label: string; className: string }
> = {
  draft: {
    description: 'Schedule is off. Toggle to enable scheduled sending.',
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700',
  },
  scheduled: {
    description: 'Schedule is on. Messages will be sent on the scheduled date.',
    label: 'Scheduled',
    className: 'bg-green-100 text-green-700',
  },
  sent: {
    description: 'Messages have already been sent for this schedule.',
    label: 'Sent',
    className: 'bg-blue-100 text-blue-700',
  },
  cancelled: {
    description: 'This schedule has been cancelled.',
    label: 'Cancelled',
    className: 'bg-red-100 text-red-700',
  },
};

export function ScheduleStatusCard({ schedule }: ScheduleStatusCardProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(schedule.status);

  const isToggleable =
    optimisticStatus !== 'sent' && optimisticStatus !== 'cancelled';
  const isChecked = optimisticStatus === 'scheduled' || optimisticStatus === 'sent';
  const config = STATUS_CONFIG[optimisticStatus];

  const handleToggle = (checked: boolean) => {
    const newStatus: ScheduleStatus = checked ? 'scheduled' : 'draft';

    startTransition(async () => {
      setOptimisticStatus(newStatus);

      const promise = updateScheduleStatus(schedule.id, newStatus).then((result) => {
        if (!result.success) throw new Error(result.message ?? 'Failed to update status.');
        return result;
      });

      toast.promise(promise, {
        loading: checked ? 'Enabling schedule...' : 'Disabling schedule...',
        success: (data) => data.message ?? 'Status updated.',
        error: (err) => (err instanceof Error ? err.message : 'Something went wrong.'),
      });

      try {
        await promise;
      } catch {
        // Optimistic update will revert on revalidation
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {schedule.allowDisable ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Schedule Status</span>
              <span
                className={`rounded-sm px-2 py-0.5 text-xs font-medium ${config.className}`}
              >
                {config.label}
              </span>
            </div>
            <Switch
              checked={isChecked}
              onCheckedChange={handleToggle}
              disabled={!isToggleable || isPending}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Schedule Status</span>
            <span
              className={`rounded-sm px-2 py-0.5 text-xs font-medium ${config.className}`}
            >
              {config.label}
            </span>
          </div>
        )}
        <p className="text-muted-foreground text-sm">{config.description}</p>
      </CardContent>
    </Card>
  );
}
