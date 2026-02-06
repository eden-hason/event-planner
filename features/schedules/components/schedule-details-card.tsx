'use client';

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { updateScheduledDate, updateScheduleStatus } from '../actions';
import type { ScheduleApp, ScheduleStatus, WhatsAppTemplateApp } from '../schemas';

interface ScheduleDetailsCardProps {
  schedule: ScheduleApp | undefined;
  template: WhatsAppTemplateApp | null;
  eventDate: string;
}

const STATUS_CONFIG: Record<
  ScheduleStatus,
  { description: string }
> = {
  draft: {
    description: 'Schedule is off. Toggle to enable scheduled sending.',
  },
  scheduled: {
    description: 'Schedule is on. Messages will be sent on the scheduled date.',
  },
  sent: {
    description: 'Messages have already been sent for this schedule.',
  },
  cancelled: {
    description: 'This schedule has been cancelled.',
  },
};

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

/**
 * Formats an ISO date string to YYYY-MM-DD for a date input.
 */
function toDateInputValue(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function ScheduleDetailsCard({
  schedule,
  template,
  eventDate,
}: ScheduleDetailsCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    schedule?.status ?? 'draft',
  );

  // --- Scheduled date state ---
  const initialDateValue = schedule?.scheduledDate ?? '';
  const [scheduledDate, setScheduledDate] = useState(initialDateValue);

  const daysBeforeEvent = useMemo(() => {
    if (!eventDate || !scheduledDate) return 0;
    return computeDaysBefore(eventDate, scheduledDate);
  }, [eventDate, scheduledDate]);

  const dateInputValue = useMemo(() => {
    if (!scheduledDate) return '';
    return toDateInputValue(scheduledDate);
  }, [scheduledDate]);

  const isDirty = scheduledDate !== initialDateValue;

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = parseInt(e.target.value, 10);
    if (isNaN(days) || !eventDate) return;

    const event = new Date(eventDate);
    const newDate = new Date(event);
    newDate.setDate(event.getDate() - days);

    // Preserve the time from the current scheduledDate
    if (scheduledDate) {
      const existing = new Date(scheduledDate);
      newDate.setHours(existing.getHours(), existing.getMinutes(), existing.getSeconds());
    }

    setScheduledDate(newDate.toISOString());
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value; // YYYY-MM-DD
    if (!dateValue) return;

    const [year, month, day] = dateValue.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);

    // Preserve the time from the current scheduledDate
    if (scheduledDate) {
      const existing = new Date(scheduledDate);
      newDate.setHours(existing.getHours(), existing.getMinutes(), existing.getSeconds());
    }

    setScheduledDate(newDate.toISOString());
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
        loading: 'Updating scheduled date...',
        success: (data) => data.message ?? 'Scheduled date updated.',
        error: (err) =>
          err instanceof Error ? err.message : 'Something went wrong.',
      });

      try {
        await promise;
      } catch {
        // Revalidation will reset on error
      }
    });
  };

  // --- Status toggle ---
  const isToggleable =
    !!schedule && optimisticStatus !== 'sent' && optimisticStatus !== 'cancelled';
  const isChecked = optimisticStatus === 'scheduled' || optimisticStatus === 'sent';

  const config = schedule
    ? STATUS_CONFIG[optimisticStatus]
    : { description: 'No schedule exists for this message type.' };

  const handleToggle = (checked: boolean) => {
    if (!schedule) return;

    const newStatus: ScheduleStatus = checked ? 'scheduled' : 'draft';

    startTransition(async () => {
      setOptimisticStatus(newStatus);

      const promise = updateScheduleStatus(schedule.id, newStatus).then(
        (result) => {
          if (!result.success) throw new Error(result.message ?? 'Failed to update status.');
          return result;
        },
      );

      toast.promise(promise, {
        loading: checked ? 'Enabling schedule...' : 'Disabling schedule...',
        success: (data) => data.message ?? 'Status updated.',
        error: (err) =>
          err instanceof Error ? err.message : 'Something went wrong.',
      });

      try {
        await promise;
      } catch {
        // Optimistic update will revert on revalidation
      }
    });
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Schedule Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormItem>
          <div className="flex items-center justify-between gap-4">
            <Label>Status</Label>
            <Switch
              checked={isChecked}
              onCheckedChange={handleToggle}
              disabled={!isToggleable || isPending}
            />
          </div>
          <p className="text-muted-foreground text-sm">{config.description}</p>
        </FormItem>

        {schedule && eventDate && (
          <FormItem>
            <Label>Scheduled Date</Label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={daysBeforeEvent}
                  onChange={handleDaysChange}
                  className="w-20"
                  disabled={isSaving}
                />
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  days before
                </span>
              </div>
              <Input
                type="date"
                value={dateInputValue}
                onChange={handleDateChange}
                className="w-auto"
                disabled={isSaving}
              />
            </div>
          </FormItem>
        )}
      </CardContent>

      {isDirty && (
        <CardFooter className="border-t">
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
