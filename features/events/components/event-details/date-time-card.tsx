'use client';

import { useFormContext } from 'react-hook-form';
import { CalendarDays } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { EventDetailsUpdate } from '../../schemas';
import { EVENT_TYPE_LABELS, EventType } from '../../utils/event-types';

function formatEventDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DateTimeCard() {
  const form = useFormContext<EventDetailsUpdate>();
  const eventDate = form.watch('eventDate');
  const eventType = form.watch('eventType');

  const typeLabel = eventType
    ? (EVENT_TYPE_LABELS[eventType as EventType] ?? eventType)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="rounded-md bg-primary/10 p-1.5">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          Date & Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <p className="text-sm font-medium">Date</p>
            <Badge variant="secondary" className="rounded-sm px-3 py-1 text-sm font-normal">
              {formatEventDate(eventDate)}
            </Badge>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Event Type</p>
            {typeLabel ? (
              <Badge variant="secondary" className="rounded-sm px-3 py-1 text-sm font-normal">
                {typeLabel}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>

          <FormField
            control={form.control}
            name="receptionTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reception Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ceremonyTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ceremony Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
