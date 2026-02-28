'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CalendarClock, CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { updateScheduledDate } from '../actions';
import type { ScheduleApp } from '../schemas';

interface ScheduleDetailsCardProps {
  schedule: ScheduleApp | undefined;
  eventDate: string;
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
  const [isSaving, startSaveTransition] = useTransition();

  const initialDateValue = schedule?.scheduledDate ?? '';
  const [scheduledDate, setScheduledDate] = useState(initialDateValue);

  const daysBeforeEvent = useMemo(() => {
    if (!eventDate || !scheduledDate) return 0;
    return computeDaysBefore(eventDate, scheduledDate);
  }, [eventDate, scheduledDate]);

  const resolvedDateDisplay = useMemo(() => {
    if (!scheduledDate) return '';
    return new Date(scheduledDate).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [scheduledDate]);

  const isDirty = scheduledDate !== initialDateValue;

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (isNaN(parsed) || !eventDate) return;

    const event = new Date(eventDate);
    const newDate = new Date(event);
    newDate.setDate(event.getDate() - parsed);

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
      const promise = updateScheduledDate(schedule.id, scheduledDate).then((result) => {
        if (!result.success)
          throw new Error(result.message ?? 'Failed to update scheduled date.');
        return result;
      });

      toast.promise(promise, {
        loading: 'Updating scheduled date...',
        success: (data) => data.message ?? 'Scheduled date updated.',
        error: (err) => (err instanceof Error ? err.message : 'Something went wrong.'),
      });

      try {
        await promise;
      } catch {
        // Revalidation will reset on error
      }
    });
  };

  if (!schedule || !eventDate) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Schedule Timing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-xs text-muted-foreground tracking-wide">
              Days before event
            </Label>
            <div className="relative mt-1">
              <Input
                type="number"
                value={daysBeforeEvent}
                onChange={handleDaysChange}
                className="pr-12"
                disabled={isSaving}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                days
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">How far in advance to schedule this</p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground tracking-wide">
              Scheduled date
            </Label>
            <div className="flex items-center gap-2 mt-1 rounded-md border bg-muted/50 px-3 py-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{resolvedDateDisplay}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Derived from the event date</p>
          </div>
        </div>
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
