'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionState, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';
import { CheckCircle2, AlertTriangle, MapPin } from 'lucide-react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocationInput } from '@/components/ui/location-input';
import { GoogleMap } from '@/components/ui/google-map';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import {
  EventApp,
  EventDetailsUpdateSchema,
  UpdateEventDetailsState,
  LocationCoords,
  Location,
} from '../../schemas';
import { updateEventDetails } from '../../actions';

const LocationCardSchema = EventDetailsUpdateSchema.pick({ id: true, location: true });
type LocationCardValues = z.infer<typeof LocationCardSchema>;

interface LocationCardProps {
  event: EventApp;
}

export function LocationCard({ event }: LocationCardProps) {
  const t = useTranslations('eventDetails.location');
  const tHeader = useTranslations('eventDetails.header');

  const form = useForm<LocationCardValues>({
    resolver: zodResolver(LocationCardSchema),
    defaultValues: {
      id: event.id,
      location: event.location || undefined,
    },
  });

  const isDirty = form.formState.isDirty;
  const location = form.watch('location');

  const [, formAction, isPending] = useActionState(
    async (_prev: UpdateEventDetailsState | null, formData: FormData) => {
      try {
        const result = await updateEventDetails(formData);
        if (result.success) {
          toast.success(result.message);
          form.reset(form.getValues());
        } else {
          toast.error(result.message);
        }
        return result;
      } catch {
        toast.error('Something went wrong');
        return null;
      }
    },
    null,
  );

  const onSubmit = (values: LocationCardValues) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') formData.append(key, JSON.stringify(value));
        else formData.append(key, String(value));
      }
    });
    startTransition(() => formAction(formData));
  };

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-primary" />
              <CardTitle className="text-xl font-bold">{t('title')}</CardTitle>
            </div>
            {isDirty && (
              <CardAction className="animate-in fade-in-0 zoom-in-95 duration-200">
                <Button type="submit" size="sm" disabled={isPending}>
                  <IconDeviceFloppy className="size-4" />
                  {isPending ? tHeader('saving') : tHeader('save')}
                </Button>
              </CardAction>
            )}
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
            <GoogleMap coords={location?.coords} height="300px" />
            <div
              className={cn(
                'flex items-start gap-3 rounded-lg p-3 text-sm',
                location?.coords
                  ? 'bg-green-50 text-green-800'
                  : 'bg-amber-50 text-amber-800',
              )}
            >
              {location?.coords ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              )}
              <div>
                <p className="font-medium">
                  {location?.coords ? t('status.set.title') : t('status.notSet.title')}
                </p>
                <p className="text-xs opacity-80">
                  {location?.coords
                    ? t('status.set.description')
                    : t('status.notSet.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
