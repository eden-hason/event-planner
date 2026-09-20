'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionState, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';
import { CalendarDays, X } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  EventApp,
  EventDetailsUpdateSchema,
  UpdateEventDetailsState,
} from '../../schemas';
import { updateEventDetails } from '../../actions';
import { EventType } from '../../utils/event-types';

const DateTimeCardSchema = EventDetailsUpdateSchema.pick({
  id: true,
  eventDate: true,
  receptionTime: true,
  ceremonyTime: true,
});
type DateTimeCardValues = z.infer<typeof DateTimeCardSchema>;

/**
 * The calendar day the picker shows, pinned at 00:00 UTC.
 *
 * `events.event_date` is a calendar date, not an instant, and the whole
 * codebase reads its day in UTC - the outreach seed included. The picker hands
 * back local midnight, so `toISOString()` would shift east-of-UTC dates into
 * the previous day and silently move every schedule derived from it.
 */
function toUtcCalendarDate(date: Date): string {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  ).toISOString();
}

interface DateTimeCardProps {
  event: EventApp;
}

export function DateTimeCard({ event }: DateTimeCardProps) {
  const t = useTranslations('eventDetails.dateTime');
  const tHeader = useTranslations('eventDetails.header');
  const tToast = useTranslations('eventDetails.toast');

  const form = useForm<DateTimeCardValues>({
    resolver: zodResolver(DateTimeCardSchema),
    defaultValues: {
      id: event.id,
      eventDate: event.eventDate || '',
      receptionTime: event.receptionTime || '',
      ceremonyTime: event.ceremonyTime || '',
    },
  });

  const isDirty = form.formState.isDirty;

  const [, formAction, isPending] = useActionState(
    async (_prev: UpdateEventDetailsState | null, formData: FormData) => {
      try {
        const result = await updateEventDetails(formData);
        if (result.success) {
          toast.success(tToast('saved'));
          form.reset(form.getValues());
        } else {
          toast.error(result.message);
        }
        return result;
      } catch {
        toast.error(tToast('error'));
        return null;
      }
    },
    null,
  );

  const onSubmit = (values: DateTimeCardValues) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    startTransition(() => formAction(formData));
  };

  const eventTypeLabels: Record<EventType, string> = {
    wedding: t('types.wedding'),
    henna: t('types.henna'),
    bar_mitzva: t('types.bar_mitzva'),
    bat_mitzva: t('types.bat_mitzva'),
  };

  const typeLabel = event.eventType
    ? (eventTypeLabels[event.eventType as EventType] ?? event.eventType)
    : null;

  // Only a wedding has a ceremony (the chuppah); every other type is a single
  // reception time.
  const hasCeremony = event.eventType === 'wedding';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-primary" />
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
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/5 px-4 py-3 ring-1 ring-primary/10">
              {/*
                The date was read-only here for a long time, settable only
                during onboarding - so an event that skipped that screen had no
                way to acquire one, and nothing downstream of the date (the
                whole outreach plan, which is seeded from it) could ever exist.
              */}
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem className="min-w-52 flex-1">
                    <FormControl>
                      <DatePicker
                        date={field.value ? new Date(field.value) : undefined}
                        onDateChange={(next) =>
                          field.onChange(next ? toUtcCalendarDate(next) : '')
                        }
                        placeholder={t('date')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {typeLabel ? (
                <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {typeLabel}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>

            <div className={cn('grid grid-cols-1 gap-3', hasCeremony && 'sm:grid-cols-2')}>
              <FormField
                control={form.control}
                name="receptionTime"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                      <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t('receptionTime')}
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type="time"
                            className={cn('bg-background', field.value && 'pe-8')}
                            {...field}
                          />
                        </FormControl>
                        {field.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-1/2 end-1 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => field.onChange('')}
                          >
                            <X className="size-3" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              {hasCeremony && (
                <FormField
                  control={form.control}
                  name="ceremonyTime"
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                        <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {t('ceremonyTime')}
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type="time"
                              className={cn('bg-background', field.value && 'pe-8')}
                              {...field}
                            />
                          </FormControl>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-1/2 end-1 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => field.onChange('')}
                            >
                              <X className="size-3" />
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
