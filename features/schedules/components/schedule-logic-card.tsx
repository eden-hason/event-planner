'use client';

import { useFormContext } from 'react-hook-form';
import {
  IconBulbFilled,
  IconCalendarClock,
  IconClock,
  IconFilter,
} from '@tabler/icons-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  AudienceStatus,
  EventScheduleApp,
  TriggerStrategy,
  UpdateSchedule,
} from '../schemas';
import { Badge } from '@/components/ui/badge';

// Badge styles for different audience statuses
const audienceStatusBadgeStyles: Record<
  AudienceStatus,
  { className: string; label: string }
> = {
  pending: {
    className: 'border-yellow-200 bg-yellow-100 text-yellow-800',
    label: 'Pending',
  },
  attending: {
    className: 'border-green-200 bg-green-100 text-green-800',
    label: 'Attending',
  },
  not_attending: {
    className: 'border-red-200 bg-red-100 text-red-800',
    label: 'Not Attending',
  },
  maybe: {
    className: 'border-gray-200 bg-gray-100 text-gray-800',
    label: 'Maybe',
  },
};

// User-friendly labels for trigger strategies
const triggerStrategyLabels: Record<TriggerStrategy, string> = {
  absolute_date: 'On a specific date',
  days_before_event: 'Days before event',
  days_after_event: 'Days after event',
};

// Helper to determine which options are disabled based on schedule type
function getDisabledStrategies(
  scheduleType: EventScheduleApp['scheduleType'] | undefined,
): Set<TriggerStrategy> {
  const disabled = new Set<TriggerStrategy>();

  if (!scheduleType) return disabled;

  // For invite, followup, or reminder - days_after_event is disabled
  if (['invite', 'followup', 'reminder'].includes(scheduleType)) {
    disabled.add('days_after_event');
  }

  // For thankyou - only absolute_date is enabled (all others disabled)
  if (scheduleType === 'thankyou') {
    disabled.add('days_before_event');
    disabled.add('days_after_event');
  }

  return disabled;
}

interface ScheduleLogicCardProps {
  schedule: EventScheduleApp | null;
  eventDate?: string;
}

// Helper to calculate the trigger date based on strategy and offset
function calculateTriggerDate(
  eventDate: string | undefined,
  triggerStrategy: TriggerStrategy | undefined,
  offsetDays: number | undefined,
): Date | null {
  if (!eventDate || !triggerStrategy || triggerStrategy === 'absolute_date') {
    return null;
  }

  const eventDateObj = new Date(eventDate);
  const offset = offsetDays ?? 0;

  if (triggerStrategy === 'days_before_event') {
    const triggerDate = new Date(eventDateObj);
    triggerDate.setDate(triggerDate.getDate() - offset);
    return triggerDate;
  }

  if (triggerStrategy === 'days_after_event') {
    const triggerDate = new Date(eventDateObj);
    triggerDate.setDate(triggerDate.getDate() + offset);
    return triggerDate;
  }

  return null;
}

// Format date for display
function formatTriggerDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ScheduleLogicCard({
  schedule,
  eventDate,
}: ScheduleLogicCardProps) {
  const form = useFormContext<UpdateSchedule>();
  const triggerStrategy = form.watch('triggerStrategy');
  const scheduleType = form.watch('scheduleType');
  const offsetDays = form.watch('offsetDays');

  const isRelativeStrategy =
    triggerStrategy === 'days_before_event' ||
    triggerStrategy === 'days_after_event';
  const isAbsoluteStrategy = triggerStrategy === 'absolute_date';

  const disabledStrategies = getDisabledStrategies(scheduleType);

  // Calculate the trigger date for relative strategies
  const calculatedTriggerDate = calculateTriggerDate(
    eventDate,
    triggerStrategy,
    offsetDays,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconClock className="size-5" />
          Schedule Logic
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-7">
          {/* When to send wrapper */}
          <div className="flex flex-col gap-4">
            <FormItem>
              <FormLabel>When to send</FormLabel>
              <div className="flex items-center gap-2">
                {/* Number input for days_before_event or days_after_event */}
                {isRelativeStrategy && (
                  <FormField
                    control={form.control}
                    name="offsetDays"
                    render={({ field }) => (
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="w-20"
                          placeholder="0"
                          disabled={!schedule}
                          {...field}
                          value={field.value ?? 0}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 0)
                          }
                        />
                      </FormControl>
                    )}
                  />
                )}

                {/* Date picker for absolute_date */}
                {isAbsoluteStrategy && (
                  <FormField
                    control={form.control}
                    name="scheduledAt"
                    render={({ field }) => (
                      <FormControl>
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          onDateChange={(date) =>
                            field.onChange(date?.toISOString() || null)
                          }
                          placeholder="Select date"
                          disabled={!schedule}
                        />
                      </FormControl>
                    )}
                  />
                )}

                {/* Select for trigger strategy */}
                <FormField
                  control={form.control}
                  name="triggerStrategy"
                  render={({ field }) => (
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!schedule}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select timing" />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.entries(triggerStrategyLabels) as [
                              TriggerStrategy,
                              string,
                            ][]
                          ).map(([value, label]) => (
                            <SelectItem
                              key={value}
                              value={value}
                              disabled={disabledStrategies.has(value)}
                            >
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  )}
                />
              </div>
            </FormItem>

            {/* Show calculated trigger date for relative strategies */}
            {isRelativeStrategy && calculatedTriggerDate && (
              <div className="border-input flex flex-row items-center gap-2 rounded-md border bg-gray-100 px-3 py-2 text-sm text-gray-600">
                <IconCalendarClock className="size-4" />
                <span>
                  Message will be sent on{' '}
                  <span className="font-bold">
                    {formatTriggerDate(calculatedTriggerDate)}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Target Audience */}
          <FormItem>
            <FormLabel>Target Audience</FormLabel>
            <div className="border-input flex flex-row items-center gap-2 rounded-md border border-dashed bg-gray-100 px-3 py-2 text-sm text-gray-600">
              <IconFilter className="size-4" />
              <span>Guests with status:</span>
              {schedule?.targetAudienceStatus?.map((status) => {
                const badgeStyle = audienceStatusBadgeStyles[status];
                return (
                  <Badge
                    key={status}
                    className={`rounded-md ${badgeStyle.className}`}
                  >
                    {badgeStyle.label}
                  </Badge>
                );
              })}
              {(!schedule?.targetAudienceStatus ||
                schedule.targetAudienceStatus.length === 0) && (
                <span className="text-gray-400 italic">None selected</span>
              )}
            </div>
          </FormItem>

          {/* Expert Tip */}
          <div className="flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
            <IconBulbFilled className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="font-bold text-blue-800">Expert Tip:</span> Most
              wedding planners find that sending this nudge 4-5 days before the
              event maximizes response rates.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
