'use client';

import { useFormContext } from 'react-hook-form';
import { IconMapPin } from '@tabler/icons-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LocationInput } from '@/components/ui/location-input';
import { cardHover } from '@/lib/utils';
import { GoogleMap } from '@/components/ui/google-map';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { EventDetailsUpdate, LocationCoords, Location } from '../../schemas';

export function LocationCard() {
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
    <Card className={cardHover}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="rounded-md bg-primary/10 p-1.5">
            <IconMapPin size={16} className="text-primary" />
          </div>
          Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <GoogleMap coords={location?.coords} className="h-[250px]" />
      </CardContent>
    </Card>
  );
}
