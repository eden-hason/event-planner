'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslations, useLocale } from 'next-intl';
import { he, enUS } from 'date-fns/locale';
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  ClockPlus,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import type { EventDetailsFormValues } from '../../schemas';
import { SECTION_IDS, useEventDetails } from './event-details-context';
import { FIELD_BOX_CLASSES, SectionCard } from './section-card';

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

const LABEL_CLASSES = 'text-muted-foreground text-xs font-semibold';

/**
 * The day of the Event, as a field when there is one and as an invitation to
 * pick one when there is not.
 *
 * A cleared selection is deliberately ignored: a Schedule's Due Time is derived
 * from this date once, so clearing it would leave the seeded plan pointing at a
 * date the Event no longer has.
 */
function DateField({
  value,
  onChange,
  changed,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  /** A pending change is outlined, because it moves more than this field. */
  changed: boolean;
}) {
  const t = useTranslations('eventDetails.when');
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const selected = value ? new Date(value) : undefined;
  const dateText = selected
    ? new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
      dateStyle: 'full',
      timeZone: 'UTC',
    }).format(selected)
    : null;

  // The calendar shows local days; the stored day is UTC midnight.
  const calendarSelected = selected
    ? new Date(selected.getUTCFullYear(), selected.getUTCMonth(), selected.getUTCDate())
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {dateText ? (
        <div className="flex flex-col gap-1.5">
          <span className={LABEL_CLASSES}>{t('dateLabel')}</span>
          <PopoverTrigger asChild>
            <FormControl>
              <button
                type="button"
                className={cn(
                  FIELD_BOX_CLASSES,
                  'focus-visible:ring-ring/50 text-start outline-none focus-visible:ring-[3px] lg:text-sm',
                  'text-[14.5px]',
                  changed && 'border-primary border-[1.5px] font-bold',
                )}
              >
                <span className="truncate">{dateText}</span>
                <CalendarDays
                  className={cn(
                    'size-4 shrink-0',
                    changed ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
              </button>
            </FormControl>
          </PopoverTrigger>
        </div>
      ) : (
        <div className="border-primary/40 bg-primary/5 flex flex-col items-start gap-2.5 rounded-[14px] border-[1.5px] border-dashed px-3.5 py-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-[15px] font-extrabold">{t('noDateTitle')}</p>
            <p className="text-muted-foreground text-[12.5px] leading-relaxed">
              {t('noDateDescription')}
            </p>
          </div>
          <PopoverTrigger asChild>
            <FormControl>
              <Button type="button" className="h-9 rounded-[11px] px-4 font-bold">
                <CalendarPlus className="size-4" />
                {t('pickDate')}
              </Button>
            </FormControl>
          </PopoverTrigger>
        </div>
      )}
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={calendarSelected}
          defaultMonth={calendarSelected}
          onSelect={(next) => {
            if (next) onChange(toUtcCalendarDate(next));
            setOpen(false);
          }}
          locale={locale === 'he' ? he : enUS}
        />
      </PopoverContent>
    </Popover>
  );
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
  className,
}: {
  name: 'receptionTime' | 'ceremonyTime';
  label: string;
  disabled: boolean;
  disabledHint: string;
  className?: string;
}) {
  const t = useTranslations('eventDetails.when');
  const form = useFormContext<EventDetailsFormValues>();
  const [editing, setEditing] = useState(false);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('min-w-0 gap-1.5', className)}>
          <span className={LABEL_CLASSES}>{label}</span>

          {disabled ? (
            <div className={cn(FIELD_BOX_CLASSES, 'bg-muted text-muted-foreground font-normal')}>
              <span className="truncate">{disabledHint}</span>
              <Clock className="size-4 shrink-0" />
            </div>
          ) : !field.value && !editing ? (
            <button
              type="button"
              className={cn(
                FIELD_BOX_CLASSES,
                'border-primary/40 bg-primary/5 text-primary justify-start border-dashed text-[13.5px] font-bold',
                'hover:bg-primary/10 focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
              )}
              onClick={() => setEditing(true)}
            >
              <ClockPlus className="size-[15px] shrink-0" />
              {t('addTime')}
            </button>
          ) : (
            <div className="relative">
              <FormControl>
                <Input
                  type="time"
                  autoFocus={editing && !field.value}
                  className={cn(
                    FIELD_BOX_CLASSES,
                    'text-[14.5px] shadow-none lg:text-sm',
                    field.value && 'pe-8',
                  )}
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
      icon={<CalendarDays className="text-primary" />}
      title={t('title')}
    >
      <div className="flex flex-col gap-3">
        {/*
          Phone: the date on its own row with the times paired under it. From
          `lg` the date and the times share one row, the date twice as wide.
          The date-change warning belongs to the date, so on a phone it sits
          right under it and on desktop it drops below the row.
        */}
        <div
          className={cn(
            'grid gap-x-2.5 gap-y-3 lg:gap-x-3',
            // Without a date the prompt takes the whole row and the times
            // wait under it at equal widths.
            hasCeremony ? 'grid-cols-2' : 'grid-cols-1',
            hasDate &&
              (hasCeremony ? 'lg:grid-cols-[2fr_1fr_1fr]' : 'lg:grid-cols-[2fr_1fr]'),
          )}
        >
          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem
                className={cn(
                  'col-span-full min-w-0 gap-2',
                  hasDate && 'lg:col-span-1',
                )}
              >
                <DateField
                  value={field.value}
                  onChange={field.onChange}
                  changed={dateMoved}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {showPlanWarning && (
            <div className="border-warning-tint-border bg-warning-tint/60 col-span-full flex flex-col gap-2.5 rounded-xl border p-3 lg:order-last">
              <div className="flex items-start gap-2.5">
                <TriangleAlert className="text-warning-ink mt-0.5 size-4 shrink-0" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-[13.5px] font-bold">{t('dateChange.title')}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t(
                      plan.includesEventReminder
                        ? 'dateChange.descriptionWithReminder'
                        : 'dateChange.description',
                      { count: plan.messageCount, date: previousDateText },
                    )}
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                className="text-primary hover:text-primary h-9 rounded-[10px] text-[12.5px] font-bold lg:self-start"
              >
                <Link href={schedulesHref}>{t('dateChange.link')}</Link>
              </Button>
            </div>
          )}

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
          <p className="text-muted-foreground hidden text-xs leading-relaxed lg:block">
            {t('derivedFromDate')}
          </p>
        )}
      </div>
    </SectionCard>
  );
}
