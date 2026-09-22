'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { CircleCheck, MapPin, Navigation } from 'lucide-react';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { LocationInput } from '@/features/events/components/location-input';
import { GoogleMap } from '@/features/events/components/google-map';
import type { EventDetailsFormValues, Location, LocationCoords } from '../../schemas';
import { SECTION_IDS } from './event-details-context';
import { SectionCard, SectionStatus } from './section-card';

/**
 * Where the Event happens, which is really the navigation link in the day-of
 * reminder.
 *
 * Coordinates are the whole point, so the field is a Google Places search rather
 * than a text box: a hand-typed hall name reads fine on screen and sends every
 * Guest nowhere. Until an address is picked from the list there is nothing to
 * draw, so the map says so instead of showing an empty world.
 */
export function LocationSection() {
  const t = useTranslations('eventDetails.where');
  const form = useFormContext<EventDetailsFormValues>();
  const location = form.watch('location');
  const hasCoords = Boolean(location?.coords);

  const handleChange = (
    value: string,
    _placeId?: string,
    coords?: LocationCoords,
  ) => {
    const next: Location = { name: value, coords };
    form.setValue('location', next, { shouldDirty: true });
  };

  return (
    <SectionCard
      id={SECTION_IDS.where}
      icon={<MapPin className="text-primary size-4 shrink-0" />}
      title={t('title')}
      status={
        <SectionStatus
          tone={hasCoords ? 'ready' : 'missing'}
          label={hasCoords ? t('statusSet') : t('statusMissing')}
          icon={hasCoords ? <Navigation className="size-3" /> : undefined}
        />
      }
    >
      <div className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              {/*
                The wrapper carries the marker rather than the input: the
                readiness summary's "add a venue" resolves it to the first
                focusable control inside, and `LocationInput` owns its own field.
              */}
              <FormControl>
                <div data-readiness-focus>
                  <LocationInput
                    placeholder={t('placeholder')}
                    value={field.value?.name || ''}
                    onChange={handleChange}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-muted-foreground text-xs leading-relaxed">
          {hasCoords ? t('hintPicked') : t('hint')}
        </p>

        {hasCoords ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-semibold">
              {t('mapLabel')}
            </span>
            <GoogleMap
              coords={location?.coords}
              className="h-[180px] rounded-lg sm:h-[240px]"
            />
          </div>
        ) : (
          <div className="bg-muted/50 text-muted-foreground flex h-[120px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 text-center text-xs">
            <MapPin className="size-4" />
            {t('mapPending')}
          </div>
        )}

        {hasCoords && (
          <p className="text-success flex items-center gap-1.5 text-xs font-medium">
            <CircleCheck className="size-3.5 shrink-0" />
            {t('statusSetLong')}
          </p>
        )}
      </div>
    </SectionCard>
  );
}
