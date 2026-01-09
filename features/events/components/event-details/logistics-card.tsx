'use client';

import { useFormContext } from 'react-hook-form';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { LocationInput } from '@/components/ui/location-input';
import { GoogleMap } from '@/components/ui/google-map';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { EventDetailsUpdate, LocationCoords, Location } from '../../schemas';

export function LogisticsCard() {
  const form = useFormContext<EventDetailsUpdate>();
  const location = form.watch('location');

  const handleLocationChange = (
    value: string,
    placeId?: string,
    coords?: LocationCoords,
  ) => {
    const newLocation: Location = {
      name: value,
      coords: coords,
    };
    form.setValue('location', newLocation, { shouldDirty: true });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5" />
          Event Logistics
        </CardTitle>
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
          <div className="col-span-2 space-y-2">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <LocationInput
                      placeholder="Search for venue address..."
                      value={field.value?.name || ''}
                      onChange={handleLocationChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <GoogleMap coords={location?.coords} height="250px" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
