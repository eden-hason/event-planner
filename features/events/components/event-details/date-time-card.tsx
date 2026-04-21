'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
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
import { EventType } from '../../utils/event-types';

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
  const t = useTranslations('eventDetails.dateTime');
  const form = useFormContext<EventDetailsUpdate>();
  const eventDate = form.watch('eventDate');
  const eventType = form.watch('eventType');

  const eventTypeLabels: Record<EventType, string> = {
    wedding: t('types.wedding'),
    birthday: t('types.birthday'),
    corporate: t('types.corporate'),
    other: t('types.other'),
  };

  const typeLabel = eventType
    ? (eventTypeLabels[eventType as EventType] ?? eventType)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('date')}</p>
            <Badge variant="secondary" className="rounded-sm px-3 py-1 text-sm font-normal">
              {formatEventDate(eventDate)}
            </Badge>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t('eventType')}</p>
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
                <FormLabel>{t('receptionTime')}</FormLabel>
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
                <FormLabel>{t('ceremonyTime')}</FormLabel>
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
