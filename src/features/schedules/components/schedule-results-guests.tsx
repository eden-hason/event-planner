'use client';

import { useMemo, useState, type Ref } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

import type { GuestInteractionRow } from '../queries/guest-interactions';
import {
  availableFilters,
  filterGuests,
  formatMoment,
  guestStatus,
  lastActivityAt,
  seenState,
  type GuestFilter,
  type GuestStatus,
} from '../utils/schedule-results';
import { useChannelLabel } from './guest-journey';
import { RESULT_TONE } from './results-presentation';

/** Rows shown at first, and how many each "more" adds. 300+ records page in steps. */
const FIRST = 10;
const STEP = 25;

const STATUS_TONE: Record<GuestStatus, keyof typeof RESULT_TONE> = {
  seen: 'ok',
  delivered: 'ok',
  sms: 'info',
  on_its_way: 'pending',
  not_delivered: 'bad',
  no_phone: 'neutral',
  none: 'neutral',
};

const CHANNEL_SWATCH = {
  whatsapp: 'bg-channel-whatsapp',
  sms: 'bg-channel-sms',
  none: 'bg-muted-foreground/40',
} as const;

function channelSwatch(row: GuestInteractionRow) {
  if (row.delivery === 'sms') return CHANNEL_SWATCH.sms;
  if (row.delivery === 'no_phone' || row.delivery === null)
    return CHANNEL_SWATCH.none;
  return CHANNEL_SWATCH.whatsapp;
}

interface ScheduleResultsGuestsProps {
  guests: GuestInteractionRow[];
  collectsRsvp: boolean;
  showSeen: boolean;
  filter: GuestFilter;
  onFilterChange: (filter: GuestFilter) => void;
  selectedId: string | null;
  onSelect: (guestId: string) => void;
  now: Date;
  locale: string;
  isRTL: boolean;
  ref?: Ref<HTMLElement>;
}

/**
 * Every guest the schedule went to, each on their current rung of the ladder,
 * with the channel that carried it and when they last moved. Search and
 * filters narrow it; a row opens that guest's journey.
 *
 * Stacked rows on a narrow pane, a table from `@3xl` - measured on the results
 * container, since the pane shares the screen with the timeline and a wide
 * viewport is not a wide pane.
 */
export function ScheduleResultsGuests({
  guests,
  collectsRsvp,
  showSeen,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
  now,
  locale,
  isRTL,
  ref,
}: ScheduleResultsGuestsProps) {
  const t = useTranslations('schedules.results.guests');
  const tPeople = useTranslations('schedules.results');
  const channelLabel = useChannelLabel();
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(FIRST);

  const chips = availableFilters({ collectsRsvp, showSeen });
  // A reason picked from the not-reached card is not one of the chips, so it
  // shows as an extra, active chip until the Owner picks another.
  const allChips: GuestFilter[] = chips.includes(filter)
    ? chips
    : [...chips, filter];
  const rows = useMemo(
    () => filterGuests(guests, { filter, query }),
    [guests, filter, query],
  );
  const visible = rows.slice(0, shown);
  const remaining = rows.length - visible.length;

  const narrow = (next: () => void) => {
    next();
    setShown(FIRST);
  };

  const when = (row: GuestInteractionRow) => {
    const at = lastActivityAt(row);
    return at ? formatMoment(at, { now, locale }) : '-';
  };

  const seenText = (row: GuestInteractionRow) => {
    const state = seenState(row);
    if (state === 'seen')
      return {
        text: t('seenState.seen'),
        className: 'text-rsvp-confirmed-strong',
      };
    if (state === 'unseen')
      return {
        text: t('seenState.unseen'),
        className: 'text-muted-foreground',
      };
    if (row.delivery === 'sms')
      return {
        text: t('seenState.sms'),
        className: 'text-muted-foreground/60',
      };
    return { text: '-', className: 'text-muted-foreground/60' };
  };

  const answer = (row: GuestInteractionRow) => {
    if (row.response === 'rsvp_confirm') {
      return {
        text: [
          t('answer.confirmed'),
          row.guestCount ? tPeople('people', { count: row.guestCount }) : '',
        ]
          .filter(Boolean)
          .join(' · '),
        className: RESULT_TONE.ok,
      };
    }
    if (row.response === 'rsvp_decline')
      return { text: t('answer.declined'), className: RESULT_TONE.bad };
    return null;
  };

  const statusChip = (row: GuestInteractionRow) => {
    const status = guestStatus(row);
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-bold whitespace-nowrap @3xl:px-[9px] @3xl:py-1 @3xl:text-[11.5px]',
          RESULT_TONE[STATUS_TONE[status]],
        )}
      >
        {t(`status.${status}`)}
      </span>
    );
  };

  const channelTag = (row: GuestInteractionRow) => {
    const label = channelLabel(row);
    if (!label) return null;
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px] @3xl:text-[11.5px]">
        <span className={cn('size-1.5 rounded-[2px]', channelSwatch(row))} />
        {label}
      </span>
    );
  };

  const Chevron = isRTL ? IconChevronLeft : IconChevronRight;

  // Guest, delivery, [seen], [answer], last update
  const columns = [
    'minmax(120px,1.4fr)',
    '110px',
    ...(showSeen ? ['84px'] : []),
    ...(collectsRsvp ? ['128px'] : []),
    '96px',
  ].join(' ');

  return (
    <section
      ref={ref}
      className="bg-card flex scroll-mt-4 flex-col overflow-hidden rounded-2xl border"
    >
      <div className="flex flex-col gap-2.5 px-4 pt-3.5 pb-3 @3xl:flex-row @3xl:flex-wrap @3xl:items-center @3xl:gap-3">
        <div className="flex items-baseline justify-between gap-2 @3xl:justify-start">
          <h3 className="text-sm font-bold @3xl:text-[15px]">{t('title')}</h3>
          <span className="text-muted-foreground text-xs">
            {t('count', { count: guests.length })}
          </span>
        </div>

        <div className="relative @3xl:ms-auto @3xl:w-56">
          <IconSearch
            size={15}
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
          />
          <Input
            value={query}
            onChange={(e) => narrow(() => setQuery(e.target.value))}
            placeholder={t('search')}
            aria-label={t('search')}
            className="bg-background ps-9"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {allChips.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => narrow(() => onFilterChange(key))}
              className={cn(
                'shrink-0 rounded-full px-[11px] py-1.5 text-xs whitespace-nowrap transition-colors',
                filter === key
                  ? 'bg-foreground text-background font-bold'
                  : 'bg-muted text-muted-foreground hover:bg-accent font-medium',
              )}
            >
              {t(`filters.${key}`)}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-muted-foreground border-t px-4 py-6 text-center text-[13px]">
          {t('none')}
        </p>
      )}

      {/* Narrow: each guest a stacked row */}
      <div className="@3xl:hidden">
        {visible.map((row) => {
          const seen = seenText(row);
          const ans = answer(row);
          return (
            <button
              key={row.guestId}
              type="button"
              onClick={() => onSelect(row.guestId)}
              className={cn(
                'hover:bg-muted/50 flex w-full items-center gap-2.5 border-t px-4 py-[11px] text-start transition-colors',
                selectedId === row.guestId && 'bg-primary/5',
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <span className="truncate text-sm font-bold">
                  {row.guestName}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {statusChip(row)}
                  {channelTag(row)}
                  {showSeen &&
                    guestStatus(row) !== 'seen' &&
                    seenState(row) !== 'na' && (
                      <span className={cn('text-[11px]', seen.className)}>
                        {seen.text}
                      </span>
                    )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {ans && (
                  <span
                    className={cn(
                      'rounded-lg px-2 py-[3px] text-[11.5px] font-bold whitespace-nowrap',
                      ans.className,
                    )}
                  >
                    {ans.text}
                  </span>
                )}
                <span className="text-muted-foreground text-[11px] whitespace-nowrap tabular-nums">
                  {when(row)}
                </span>
              </div>
              <Chevron
                size={15}
                className="text-muted-foreground/50 shrink-0"
              />
            </button>
          );
        })}
      </div>

      {/* Wide: a table */}
      <div className="hidden @3xl:block">
        {rows.length > 0 && (
          <div
            className="bg-muted/40 text-muted-foreground grid gap-2.5 border-y px-4 py-2 text-[11.5px] font-bold"
            style={{ gridTemplateColumns: columns }}
          >
            <span>{t('columns.guest')}</span>
            <span>{t('columns.delivery')}</span>
            {showSeen && <span>{t('columns.seen')}</span>}
            {collectsRsvp && <span>{t('columns.answer')}</span>}
            <span className="text-end">{t('columns.lastUpdate')}</span>
          </div>
        )}
        {visible.map((row) => {
          const seen = seenText(row);
          const ans = answer(row);
          return (
            <button
              key={row.guestId}
              type="button"
              onClick={() => onSelect(row.guestId)}
              className={cn(
                'hover:bg-muted/50 grid w-full items-center gap-2.5 border-b px-4 py-3 text-start transition-colors last:border-b-0',
                selectedId === row.guestId && 'bg-primary/5',
              )}
              style={{ gridTemplateColumns: columns }}
            >
              <span className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-sm font-semibold">
                  {row.guestName}
                </span>
                {channelTag(row)}
              </span>
              <span>{statusChip(row)}</span>
              {showSeen && (
                <span className={cn('text-[12.5px]', seen.className)}>
                  {seen.text}
                </span>
              )}
              {collectsRsvp && (
                <span>
                  {ans ? (
                    <span
                      className={cn(
                        'rounded-lg px-[9px] py-1 text-[11.5px] font-bold whitespace-nowrap',
                        ans.className,
                      )}
                    >
                      {ans.text}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-[12.5px]">
                      {t('answer.pending')}
                    </span>
                  )}
                </span>
              )}
              <span className="text-muted-foreground text-end text-[12.5px] tabular-nums">
                {when(row)}
              </span>
            </button>
          );
        })}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setShown((n) => n + STEP)}
          className="text-primary hover:bg-muted/50 border-t px-4 py-3 text-center text-[13px] font-semibold transition-colors"
        >
          {t('more', { count: remaining })}
        </button>
      )}
    </section>
  );
}
