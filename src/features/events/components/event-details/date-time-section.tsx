'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslations, useLocale } from 'next-intl';
import { CalendarDays, CalendarPlus, Clock, TriangleAlert, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import type { EventDetailsFormValues } from '../../schemas';
import { SECTION_IDS, useEventDetails } from './event-details-context';
import { SectionCard } from './section-card';

/**
 * The calendar day the picker submits, pinned at 00:00 UTC.
 *
 * `events.event_date` is a calendar date, not an instant, and the whole codebase
 * reads its day in UTC - the outreach seed included. The picker hands back local
 * midnight, so `toISOString()` would shift east-of-UTC dates into the previous
 * day and silently move every Schedule derived from it.
 */
function toUtcCalendarDate(date: Date): string {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  ).toISOString();
}

/**
 * One time, which is either set or offered.
 *
 * A `type="time"` input cannot carry a placeholder, and an empty one reads as a
 * broken field rather than an optional one - so an unset time is a button until
 * the Owner asks for it.
 */
function TimeField({
  name,
  label,
  disabled,
  disabledHint,
}: {
  name: 'receptionTime' | 'ceremonyTime';
  label: string;
  disabled: boolean;
  disabledHint: string;
}) {
  const t = useTranslations('eventDetails.when');
  const form = useFormContext<EventDetailsFormValues>();
  const [editing, setEditing] = useState(false);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="bg-muted/50 gap-2 rounded-lg p-3">
          <span className="text-muted-foreground text-xs font-semibold">
            {label}
          </span>

          {disabled ? (
            <p className="text-muted-foreground flex h-9 items-center text-sm">
              {disabledHint}
            </p>
          ) : !field.value && !editing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-muted-foreground w-full justify-start font-normal"
              onClick={() => setEditing(true)}
            >
              <Clock className="size-4" />
              {t('addTime')}
            </Button>
          ) : (
            <div className="relative">
              <FormControl>
                <Input
                  type="time"
                  autoFocus={editing && !field.value}
                  className={cn('bg-background', field.value && 'pe-8')}
                  {...field}
                />
              </FormControl>
              {field.value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('clearTime')}
                  className="text-muted-foreground hover:text-foreground absolute end-1 top-1/2 size-6 -translate-y-1/2"
                  onClick={() => {
                    field.onChange('');
                    setEditing(false);
                  }}
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * When the Event happens, and what a change to that answer does not do.
 *
 * Every Schedule's Due Time is computed from this date once, at seed time, and
 * never recomputed (docs/backlog/0008), so moving the date strands the whole
 * outreach plan on the old one. The page used to hide that; now a pending change
 * says how much of the plan stays behind, and offers the one page that can fix
 * it. Clearing a set date is still impossible, for the same reason.
 */
export function DateTimeSection() {
  const t = useTranslations('eventDetails.when');
  const locale = useLocale();
  const intlLocale = locale === 'he' ? 'he-IL' : 'en-GB';
  const form = useFormContext<EventDetailsFormValues>();
  const { hasCeremony, savedEventDate, plan, schedulesHref } = useEventDetails();

  const eventDate = form.watch('eventDate');
  const hasDate = Boolean(eventDate);

  const dateMoved = Boolean(savedEventDate) && eventDate !== savedEventDate;
  const showPlanWarning = dateMoved && plan.messageCount > 0;

  const previousDateText = savedEventDate
    ? new Intl.DateTimeFormat(intlLocale, {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(savedEventDate))
    : '';

  return (
    <SectionCard
      id={SECTION_IDS.when}
      icon={<CalendarDays className="text-primary size-4 shrink-0" />}
      title={t('title')}
    >
      <div className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="eventDate"
          render={({ field }) => (
            <FormItem className="gap-2">
              {hasDate ? (
                <>
                  <span className="text-muted-foreground text-xs font-semibold">
                    {t('dateLabel')}
                  </span>
                  <FormControl>
                    <DatePicker
                      date={field.value ? new Date(field.value) : undefined}
                      // A cleared selection is deliberately ignored: a Schedule's
                      // Due Time is derived from this date once, so clearing it
                      // would leave the seeded plan pointing at a date the Event
                      // no longer has.
                      onDateChange={(next) => {
                        if (next) field.onChange(toUtcCalendarDate(next));
                      }}
                      placeholder={t('dateLabel')}
                    />
                  </FormControl>
                </>
              ) : (
                <div className="border-primary/20 bg-primary/5 flex flex-col gap-2.5 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-bold">{t('noDateTitle')}</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {t('noDateDescription')}
                    </p>
                  </div>
                  <FormControl>
                    <DatePicker
                      date={undefined}
                      onDateChange={(next) => {
                        if (next) field.onChange(toUtcCalendarDate(next));
                      }}
                      placeholder={t('pickDate')}
                    />
                  </FormControl>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {showPlanWarning && (
          <div className="border-warning/20 bg-warning/10 flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <TriangleAlert className="text-warning mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-warning text-sm font-bold">
                  {t('dateChange.title')}
                </p>
                <p className="text-warning/90 text-xs leading-relaxed">
                  {t(
                    plan.includesEventReminder
                      ? 'dateChange.descriptionWithReminder'
                      : 'dateChange.description',
                    { count: plan.messageCount, date: previousDateText },
                  )}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="self-start">
              <Link href={schedulesHref}>{t('dateChange.link')}</Link>
            </Button>
          </div>
        )}

        <div className={cn('grid gap-3', hasCeremony && 'sm:grid-cols-2')}>
          <TimeField
            name="receptionTime"
            label={t('receptionTime')}
            disabled={!hasDate}
            disabledHint={t('timeNeedsDate')}
          />
          {hasCeremony && (
            <TimeField
              name="ceremonyTime"
              label={t('ceremonyTime')}
              disabled={!hasDate}
              disabledHint={t('timeNeedsDate')}
            />
          )}
        </div>

        {hasDate && (
          <p className="text-muted-foreground hidden items-center gap-1.5 text-xs lg:flex">
            <CalendarPlus className="size-3.5 shrink-0" />
            {t('derivedFromDate')}
          </p>
        )}
      </div>
    </SectionCard>
  );
}
