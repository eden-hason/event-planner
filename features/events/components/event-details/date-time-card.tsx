'use client';

import { useFormContext } from 'react-hook-form';
import { CalendarDays } from 'lucide-react';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { EventDetailsUpdate } from '../../schemas';

export function DateTimeCard() {
  const form = useFormContext<EventDetailsUpdate>();
  const eventType = form.watch('eventType');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5" />
          Date & Time
        </CardTitle>
        <CardAction>
          <Badge variant="secondary">
            {eventType?.trim() || '—'}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <DatePicker
                    placeholder="Select date"
                    date={field.value ? new Date(field.value) : undefined}
                    onDateChange={(date) =>
                      field.onChange(date?.toISOString() || '')
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Type</FormLabel>
                <FormControl>
                  <Input placeholder="Enter event type" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
