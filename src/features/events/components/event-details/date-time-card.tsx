'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionState, startTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';
import { CalendarDays, X } from 'lucide-react';
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
  receptionTime: true,
  ceremonyTime: true,
});
type DateTimeCardValues = z.infer<typeof DateTimeCardSchema>;

function formatEventDate(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

interface DateTimeCardProps {
  event: EventApp;
}

export function DateTimeCard({ event }: DateTimeCardProps) {
  const t = useTranslations('eventDetails.dateTime');
  const tHeader = useTranslations('eventDetails.header');
  const locale = useLocale();

  const form = useForm<DateTimeCardValues>({
    resolver: zodResolver(DateTimeCardSchema),
    defaultValues: {
      id: event.id,
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
            <div className="flex items-center justify-between rounded-lg bg-primary/5 px-4 py-3 ring-1 ring-primary/10">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold">{formatEventDate(event.eventDate, locale)}</span>
              </div>
              {typeLabel ? (
                <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {typeLabel}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
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
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
