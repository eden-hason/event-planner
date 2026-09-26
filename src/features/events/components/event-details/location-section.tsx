'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Check, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
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
      icon={<MapPin className="text-home-violet" />}
      title={t('title')}
      status={
        hasCoords ? (
          // Desktop has room beside the title to say what the venue buys.
          <>
            <SectionStatus
              tone="ready"
              label={t('statusSet')}
              icon={<Check className="size-3" strokeWidth={2.6} />}
              className="lg:hidden"
            />
            <SectionStatus
              tone="ready"
              label={t('statusSetLong')}
              icon={<Check className="size-3" strokeWidth={2.6} />}
              className="hidden lg:inline-flex"
            />
          </>
        ) : (
          <SectionStatus tone="missing" label={t('statusMissing')} />
        )
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div>
                    <LocationInput
                      placeholder={t('placeholder')}
                      value={field.value?.name || ''}
                      onChange={handleChange}
                      className={cn(
                        hasCoords &&
                          '[&_[data-slot=input-group-addon]]:text-home-violet',
                      )}
                      inputClassName="h-9 rounded-xl font-semibold lg:rounded-[11px]"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <p
            className={cn(
              'text-muted-foreground text-xs leading-relaxed',
              // Once a place is picked the map says it better on a phone.
              hasCoords && 'hidden lg:block',
            )}
          >
            {hasCoords ? t('hintPicked') : t('hint')}
          </p>
        </div>

        {hasCoords && (
          <div className="relative h-32 shrink-0 overflow-hidden rounded-[13px] border lg:h-[132px] lg:w-[236px] lg:rounded-xl">
            <GoogleMap coords={location?.coords} className="size-full rounded-none border-0" />
            <span className="bg-background/90 text-muted-foreground pointer-events-none absolute start-2.5 bottom-2 rounded-lg px-2 py-1 text-[11px] font-semibold">
              {t('mapLabel')}
            </span>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
