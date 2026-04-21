'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export function LocationCard() {
  const t = useTranslations('eventDetails.location');
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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('label')}</FormLabel>
              <FormControl>
                <LocationInput
                  placeholder={t('placeholder')}
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
