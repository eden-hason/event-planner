'use client';

import { useFormContext } from 'react-hook-form';
import { CalendarDays, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { LocationInput } from '@/components/ui/location-input';
import { Map, MapTileLayer, MapMarker } from '@/components/ui/map';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { EventDetailsUpdate, LocationCoords, Location } from '../../schemas';

function MapEmptyState() {
  return (
    <div className="relative h-[250px] w-full overflow-hidden rounded-lg border">
      {/* Gray gradient background with pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(148 163 184 / 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(148 163 184 / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Empty state content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="rounded-full bg-slate-200/80 p-4">
          <MapPin className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-sm text-slate-500">
          Search for a location to see it on the map
        </p>
      </div>
    </div>
  );
}

function PrimaryMarkerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="40"
      viewBox="0 0 32 40"
      className="drop-shadow-md"
    >
      <path
        className="fill-primary"
        d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z"
      />
      <circle fill="white" cx="16" cy="16" r="6" />
    </svg>
  );
}

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

  const hasCoords = location?.coords?.lat && location?.coords?.lng;

  return (
    <Card>
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
            {hasCoords ? (
              <Map
                center={[location.coords!.lat, location.coords!.lng]}
                zoom={15}
                className="h-[250px] min-h-0 rounded-lg border"
              >
                <MapTileLayer />
                <MapMarker
                  position={[location.coords!.lat, location.coords!.lng]}
                  icon={<PrimaryMarkerIcon />}
                  iconAnchor={[16, 40]}
                />
              </Map>
            ) : (
              <MapEmptyState />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
