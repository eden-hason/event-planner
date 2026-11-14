'use client';

import { useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { IconMessage, IconUserCheck, IconUsers } from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { AutoRefresh } from '@/components/auto-refresh';
import { GHOST_BAR, GhostEmpty } from '@/components/ghost-empty';
import { RefreshButton } from '@/components/refresh-button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';

import type {
  GuestInteractionRow,
  ScheduleInteractionData,
} from '../queries/guest-interactions';
import {
  formatAgo,
  formatMoment,
  percent,
  resultsLiveness,
  filterCounts,
  type GuestFilter,
} from '../utils/schedule-results';
import { GuestDetailsSheetBody } from './guest-activity';
import { RESULT_TONE } from './results-presentation';
import { ScheduleResultsGuests } from './schedule-results-guests';

interface ScheduleResultsProps {
  data: ScheduleInteractionData;
  collectsRsvp: boolean;
  channel: 'whatsapp' | 'sms' | null;
  sentAt?: string;
  /** False under an SMS Fallback Opt-out: no SMS placeholder before results arrive. */
  smsFallback: boolean;
  /** When the server produced `data`; every relative time is measured from it. */
  renderedAt: string;
}

/**
 * The Results tab: watch the message land.
 *
 * On top, the live state, how the message arrived and who is coming; below, every
 * guest and their message's activity. Everything is in guest records, and three rules from
 * CONTEXT.md and ADR 0011/0012 shape it:
 *
 * - Seen is scored against the WhatsApp deliveries that could report it, never
 *   against the audience, so an SMS guest never reads as unseen.
 * - The channel is an attribute, not a state: "reached by SMS", never an "SMS"
 *   status beside "delivered".
 * - Nothing promises a retry. SMS Fallback appears only once it has happened.
 *
 * There is no live push. While the schedule is still moving the page re-renders
 * from the server every 30 seconds, and it always reads correctly as a still
 * snapshot with its update time and a Refresh button.
 *
 * Laid out against its own width (container queries), not the viewport: the
 * pane shares the screen with the timeline.
 */
export function ScheduleResults({
  data,
  collectsRsvp,
  channel,
  sentAt,
  smsFallback,
  renderedAt,
}: ScheduleResultsProps) {
  const locale = useLocale();
  const now = useMemo(() => new Date(renderedAt), [renderedAt]);
  const { summary, guests } = data;

  const [filter, setFilter] = useState<GuestFilter>('all');
  const guestsRef = useRef<HTMLDivElement>(null);
  const counts = useMemo(() => filterCounts(guests), [guests]);
  // A row or tile of the cards filters the guests and brings them into view;
  // the applied one again clears it.
  const showFilter = (next: GuestFilter) => {
    const applied = filter === next ? 'all' : next;
    setFilter(applied);
    if (applied !== 'all')
      guestsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  // A second click on the open guest closes it
  const toggleGuest = (guestId: string) =>
    setSelectedId((current) => (current === guestId ? null : guestId));

  const isSms = channel === 'sms';

  // An SMS Fallback still to go out is a state about to change, like any other
  // message on its way.
  const onItsWay = summary.notReached.onItsWay + summary.notReached.smsOnItsWay;

  const liveness = resultsLiveness({
    sentAt,
    onItsWay,
    collectsRsvp,
    now,
  });

  const selected = guests.find((g) => g.guestId === selectedId) ?? null;
  // The sheet keeps the last guest while it slides away, rather than emptying
  // the moment the guest is let go (derived state, set during render).
  const [sheetRow, setSheetRow] = useState<GuestInteractionRow | null>(null);
  if (selected && selected !== sheetRow) setSheetRow(selected);

  const live = (
    <LiveStrip
      liveness={liveness}
      sentAt={sentAt}
      onItsWay={onItsWay}
      now={now}
      locale={locale}
    />
  );

  if (guests.length === 0) {
    return (
      <div className="flex flex-col gap-3.5">
        {live}
        <ScheduleResultsGhost
          collectsRsvp={collectsRsvp}
          channel={channel}
          smsFallback={smsFallback}
        />
      </div>
    );
  }

  return (
    <div className="@container">
      <div className="flex flex-col gap-3.5">
        {live}

        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Side by side, half each, from `@2xl`; a schedule that asks for
              no RSVP has the one card, full width. */}
          <div
            className={cn('grid gap-3.5', collectsRsvp && '@2xl:grid-cols-2')}
          >
            <ChannelsCard
              summary={summary}
              isSms={isSms}
              filter={filter}
              onSelect={showFilter}
            />
            {collectsRsvp && (
              <RsvpCard
                summary={summary}
                noResponse={counts.noResponse}
                filter={filter}
                onSelect={showFilter}
              />
            )}
          </div>

          <div ref={guestsRef} className="scroll-mt-4">
            <ScheduleResultsGuests
              guests={guests}
              collectsRsvp={collectsRsvp}
              counts={counts}
              filter={filter}
              onFilterChange={setFilter}
              selectedId={selectedId}
              onSelect={toggleGuest}
              now={now}
              locale={locale}
            />
          </div>
        </div>
      </div>

      {/* On a phone the open guest takes a sheet; on desktop it opens under its table row */}
      <Sheet
        open={!!selected && isMobile}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-[20px] border-0 px-5 pt-2.5 pb-[max(1.75rem,env(safe-area-inset-bottom))]"
        >
          {/* The content mounts only while open, by when a guest was picked */}
          {sheetRow && (
            <GuestDetailsSheetBody
              row={sheetRow}
              collectsRsvp={collectsRsvp}
              now={now}
              locale={locale}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LiveStrip({
  liveness,
  sentAt,
  onItsWay,
  now,
  locale,
}: {
  liveness: 'live' | 'settled';
  sentAt?: string;
  onItsWay: number;
  now: Date;
  locale: string;
}) {
  const t = useTranslations('schedules.results.live');
  const isLive = liveness === 'live';
  const parts = [
    sentAt && t('sentAt', { time: formatMoment(sentAt, { now, locale }) }),
    sentAt && formatAgo(sentAt, { now, locale }),
    isLive && onItsWay > 0
      ? t('onItsWay', { count: onItsWay })
      : t('updatedAt', {
          time: formatMoment(now.toISOString(), { now, locale }),
        }),
  ].filter(Boolean);

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-[14px] border px-3.5 py-[11px]',
        isLive ? 'bg-primary/5 border-primary/20' : 'bg-muted/60',
      )}
    >
      {/* Mounted with the Results tab, so polling stops on the overview */}
      <AutoRefresh active={isLive} />
      <span className="relative flex size-[9px] shrink-0">
        {isLive && (
          <span className="bg-primary absolute inline-flex size-full rounded-full opacity-75 motion-safe:animate-ping" />
        )}
        <span
          className={cn(
            'relative inline-flex size-[9px] rounded-full',
            isLive ? 'bg-primary' : 'bg-muted-foreground/60',
          )}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span
          className={cn(
            'text-[13.5px] font-bold',
            isLive ? 'text-primary' : 'text-foreground',
          )}
        >
          {isLive ? t('liveTitle') : t('settledTitle')}
        </span>
        <span className="text-muted-foreground text-xs">
          {parts.join(' · ')}
        </span>
      </div>
      <RefreshButton label={t('refresh')} withLabel />
    </div>
  );
}

function CardTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-sm font-bold @2xl:text-[15px]">{title}</h3>
      {note && (
        <span className="text-muted-foreground text-[11.5px]">{note}</span>
      )}
    </div>
  );
}

type Summary = ScheduleInteractionData['summary'];

/**
 * How the schedule arrived: WhatsApp, SMS, and what has not arrived yet. On a
 * WhatsApp schedule the SMS row is SMS Fallback - Kululu taking care of the
 * guests WhatsApp could not reach. Everything still pending - a WhatsApp the
 * phone has not confirmed, or an SMS on its way - is one On its way row: the
 * Owner has nothing to do about either, so the split would only be noise.
 *
 * Each row filters the guest table below to its guests.
 */
function ChannelsCard({
  summary,
  isSms,
  filter,
  onSelect,
}: {
  summary: Summary;
  isSms: boolean;
  filter: GuestFilter;
  onSelect: (filter: GuestFilter) => void;
}) {
  const t = useTranslations('schedules.results.channels');
  const whole = summary.audience;

  const rows: {
    key: string;
    filter: GuestFilter;
    label: string;
    sub: string;
    n: number;
    color: string;
  }[] = [
    {
      key: 'wa',
      filter: 'whatsapp' as const,
      label: t('whatsapp'),
      sub: t('whatsappSub'),
      n: summary.reachedWhatsapp,
      color: 'bg-channel-whatsapp',
    },
    {
      key: 'sms',
      filter: 'sms' as const,
      label: t('sms'),
      sub: isSms ? t('smsScheduleSub') : t('smsFallbackSub'),
      n: summary.reachedSms,
      color: 'bg-channel-sms',
    },
    {
      key: 'way',
      filter: 'pending' as const,
      label: t('onItsWay'),
      sub: t('onItsWaySub'),
      n: summary.notReached.onItsWay + summary.notReached.smsOnItsWay,
      color: 'bg-warning-solid',
    },
    {
      key: 'failed',
      filter: 'notDelivered' as const,
      label: t('notDelivered'),
      sub: t('notDeliveredSub'),
      n: summary.notReached.notDelivered,
      color: 'bg-destructive',
    },
  ].filter((row) => row.n > 0);

  return (
    <section className="bg-card flex flex-col gap-3 rounded-2xl border p-4 @2xl:p-[18px]">
      <CardTitle title={t('title')} />
      <span className="bg-muted flex h-3 gap-0.5 overflow-hidden rounded-full">
        {rows.map((row) => (
          <span
            key={row.key}
            className={cn(
              'block h-full transition-[width] duration-700 ease-out motion-reduce:transition-none',
              row.color,
            )}
            style={{ width: `${percent(row.n, whole)}%` }}
          />
        ))}
      </span>
      {/* Negative margin so a row's hover wash reaches past its text */}
      <div className="-mx-2 flex flex-col gap-0.5">
        {rows.map((row) => (
          <button
            key={row.key}
            type="button"
            aria-pressed={filter === row.filter}
            onClick={() => onSelect(row.filter)}
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-start transition-colors',
              // The guest table's applied-filter purple
              filter === row.filter
                ? 'bg-primary/8 ring-primary/40 ring-1'
                : 'hover:bg-muted',
            )}
          >
            <span
              className={cn('size-[9px] shrink-0 rounded-[3px]', row.color)}
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[13px] font-semibold">{row.label}</span>
              <span className="text-muted-foreground text-[11.5px]">
                {row.sub}
              </span>
            </span>
            <span className="text-base font-extrabold tabular-nums @2xl:text-[17px]">
              {row.n}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * Who is coming, headcount first. One record can be a whole family, so the
 * people figure is the headline and the records the supporting line.
 */
function RsvpCard({
  summary,
  noResponse,
  filter,
  onSelect,
}: {
  summary: Summary;
  /** The table's own No response count, so the tile and its chip agree */
  noResponse: number;
  filter: GuestFilter;
  onSelect: (filter: GuestFilter) => void;
}) {
  const t = useTranslations('schedules.results.rsvp');
  const answered = summary.confirmed + summary.declined;
  // Each tile filters the guest table below to its guests.
  const tiles = [
    { key: 'confirmed', n: summary.confirmed, tone: RESULT_TONE.ok },
    { key: 'declined', n: summary.declined, tone: RESULT_TONE.bad },
    { key: 'noResponse', n: noResponse, tone: RESULT_TONE.neutral },
  ] as const;

  return (
    <section className="bg-card flex flex-col gap-3 rounded-2xl border p-4 @2xl:p-[18px]">
      <CardTitle
        title={t('title')}
        note={t('note', { answered, reached: summary.askedReached })}
      />
      <div className="bg-rsvp-confirmed-tint text-rsvp-confirmed-strong flex items-end gap-3 rounded-[14px] px-3.5 py-3">
        <div className="flex flex-col gap-px">
          <span className="text-[34px] leading-none font-extrabold tabular-nums @2xl:text-4xl">
            {summary.confirmedGuests}
          </span>
          <span className="text-[12.5px] font-semibold">{t('heads')}</span>
        </div>
        <span className="ms-auto text-end text-[12.5px] leading-normal">
          {t('records', {
            confirmed: summary.confirmed,
            declined: summary.declined,
          })}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            aria-pressed={filter === tile.key}
            onClick={() => onSelect(tile.key)}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-0.5 rounded-xl px-1.5 py-[11px] transition-[filter,box-shadow] hover:brightness-95 dark:hover:brightness-110',
              tile.tone,
              // The same applied ring as the Sending status rows
              filter === tile.key && 'ring-primary/60 ring-2',
            )}
          >
            <span className="text-xl font-extrabold tabular-nums">
              {tile.n}
            </span>
            <span className="text-center text-[11.5px] font-semibold">
              {t(tile.key)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * The Results tab before there is anything to report: a schedule that has not
 * gone out, or one whose first messages have not landed yet. Each card keeps
 * its title and shows a faded ghost of what it will hold, the same empty state
 * as the Home cards, so the tab reads as "not yet" rather than as zeroes.
 */
export function ScheduleResultsGhost({
  collectsRsvp,
  channel,
  smsFallback = true,
}: {
  collectsRsvp: boolean;
  channel: 'whatsapp' | 'sms' | null;
  /** False under an SMS Fallback Opt-out: a WhatsApp Schedule's ghost has no SMS bar. */
  smsFallback?: boolean;
}) {
  const t = useTranslations('schedules.results');
  const isSms = channel === 'sms';

  const channelRows = [
    ...(isSms
      ? []
      : [{ key: 'wa', color: 'bg-channel-whatsapp/35', width: 'w-[62%]' }]),
    ...(isSms || smsFallback
      ? [
          {
            key: 'sms',
            color: 'bg-channel-sms/35',
            width: isSms ? 'w-[78%]' : 'w-[22%]',
          },
        ]
      : []),
    { key: 'way', color: 'bg-warning-solid/35', width: 'flex-1' },
  ];

  const fade = ['opacity-100', 'opacity-75', 'opacity-50', 'opacity-30'];
  // The ghosts grow with their rows, and the message sits a little below each
  // one's middle, over the faded part, as on the Home cards.
  const offset = (height: number) => `${Math.round(height * 0.28)}px`;

  return (
    <div className="@container">
      <div className="flex flex-col gap-3.5">
        <div className={cn('grid gap-3.5', collectsRsvp && '@2xl:grid-cols-2')}>
          <div>
            <section className="bg-card flex flex-col gap-3 rounded-2xl border p-4 @2xl:p-[18px]">
              <CardTitle title={t('channels.title')} />
              <GhostEmpty
                icon={<IconMessage className="size-[18px]" strokeWidth={1.9} />}
                message={t('ghost.channels')}
                overlayOffset={offset(32 * channelRows.length + 38)}
                className="pb-6"
              >
                <div className="flex flex-col gap-3">
                  <span className="flex h-3 gap-0.5 overflow-hidden rounded-full">
                    {channelRows.map((row) => (
                      <span
                        key={row.key}
                        className={cn('block h-full', row.color, row.width)}
                      />
                    ))}
                  </span>
                  <div className="flex flex-col gap-2.5">
                    {channelRows.map((row, i) => (
                      <div
                        key={row.key}
                        className={cn('flex items-center gap-2.5', fade[i])}
                      >
                        <span
                          className={cn(
                            'size-[9px] shrink-0 rounded-[3px]',
                            row.color,
                          )}
                        />
                        <div className="flex flex-1 flex-col gap-1.5">
                          <span className={cn(GHOST_BAR, 'h-[9px] w-16')} />
                          <span className={cn(GHOST_BAR, 'h-[7px] w-28')} />
                        </div>
                        <span className={cn(GHOST_BAR, 'h-3.5 w-6')} />
                      </div>
                    ))}
                  </div>
                </div>
              </GhostEmpty>
            </section>
          </div>

          {collectsRsvp && (
            <div>
              <section className="bg-card flex flex-col gap-3 rounded-2xl border p-4 @2xl:p-[18px]">
                <CardTitle title={t('rsvp.title')} />
                <GhostEmpty
                  icon={
                    <IconUserCheck className="size-[18px]" strokeWidth={1.9} />
                  }
                  message={t('ghost.rsvp')}
                  overlayOffset={offset(160)}
                  className="pb-6"
                >
                  <div className="flex flex-col gap-3">
                    <div className="bg-rsvp-confirmed-tint flex items-end gap-3 rounded-[14px] px-3.5 py-3">
                      <div className="flex flex-col gap-2">
                        <span className="bg-rsvp-confirmed/30 h-7 w-12 rounded-lg" />
                        <span className="bg-rsvp-confirmed/25 h-2 w-20 rounded-full" />
                      </div>
                      <span className="bg-rsvp-confirmed/25 ms-auto h-2 w-28 rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ['bg-rsvp-confirmed-tint', 'bg-rsvp-confirmed/30'],
                        ['bg-rsvp-declined-tint', 'bg-rsvp-declined/30'],
                        ['bg-muted', 'bg-muted-foreground/20'],
                      ].map(([tint, bar], i) => (
                        <div
                          key={tint}
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-xl px-1.5 py-3',
                            tint,
                            fade[i],
                          )}
                        >
                          <span className={cn('h-4 w-6 rounded-md', bar)} />
                          <span
                            className={cn('h-[7px] w-12 rounded-full', bar)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </GhostEmpty>
              </section>
            </div>
          )}
        </div>

        <section className="bg-card flex flex-col overflow-hidden rounded-2xl border">
          <div className="px-4 pt-3.5 pb-3">
            <h3 className="text-sm font-bold @3xl:text-[15px]">
              {t('guests.title')}
            </h3>
          </div>
          <GhostEmpty
            icon={<IconUsers className="size-[18px]" strokeWidth={1.9} />}
            message={t('ghost.guests')}
            overlayOffset={offset(212)}
            className="pb-6"
          >
            {[
              [RESULT_TONE.ok, 'w-[34%]', 'w-[22%]'],
              [RESULT_TONE.info, 'w-[28%]', 'w-[18%]'],
              [RESULT_TONE.pending, 'w-[40%]', 'w-[26%]'],
              [RESULT_TONE.bad, 'w-[24%]', 'w-[20%]'],
            ].map(([tone, name, sub], i) => (
              <div
                key={tone}
                className={cn(
                  'flex items-center gap-3 border-t px-4 py-3',
                  fade[i],
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className={cn(GHOST_BAR, 'h-[9px]', name)} />
                  <span className={cn(GHOST_BAR, 'h-[7px]', sub)} />
                </div>
                <span className={cn('h-5 w-16 rounded-full', tone)} />
              </div>
            ))}
          </GhostEmpty>
        </section>
      </div>
    </div>
  );
}
