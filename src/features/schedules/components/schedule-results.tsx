'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconMessage,
  IconSend,
  IconUserCheck,
  IconUsers,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { AutoRefresh } from '@/components/auto-refresh';
import { GHOST_BAR, GhostEmpty } from '@/components/ghost-empty';
import { RefreshButton } from '@/components/refresh-button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

import type { ScheduleInteractionData } from '../queries/guest-interactions';
import {
  formatMoment,
  percent,
  resultsLiveness,
  type GuestFilter,
} from '../utils/schedule-results';
import { GuestJourney } from './guest-journey';
import { RESULT_TONE } from './results-presentation';
import { ScheduleResultsGuests } from './schedule-results-guests';

/** The results container width (px) at which the side rail appears - Tailwind's `@4xl`. */
const RAIL_MIN_WIDTH = 896;

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
 * On top, the live state and the funnel of the whole schedule; below, each
 * guest's own journey. Everything is in guest records, and three rules from
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
  const isRTL = locale === 'he';
  const now = useMemo(() => new Date(renderedAt), [renderedAt]);
  const { summary, guests } = data;

  const [filter, setFilter] = useState<GuestFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rootRef, wide] = useIsWide();

  const isSms = channel === 'sms';
  // Scored against WhatsApp deliveries only, so shown only when there are some.
  const showSeen = !isSms && summary.seenCapable > 0;

  // An SMS Fallback still to go out is a state about to change, like any other
  // message on its way.
  const onItsWay =
    summary.notReached.onItsWay + summary.notReached.smsOnItsWay;

  const liveness = resultsLiveness({
    sentAt,
    onItsWay,
    collectsRsvp,
    now,
  });

  const selected = guests.find((g) => g.guestId === selectedId) ?? null;

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
      <div ref={rootRef} className="flex flex-col gap-3.5">
        {live}
        <ScheduleResultsGhost collectsRsvp={collectsRsvp} channel={channel} smsFallback={smsFallback} />
      </div>
    );
  }

  // The rail holds the open guest's journey, so it takes room only while one is open.
  const railOpen = !!selected && wide;

  return (
    <div ref={rootRef} className="@container">
      <div className="flex flex-col gap-3.5">
        {live}

        <div
          className={cn(
            'grid gap-3.5 @4xl:items-start',
            railOpen && '@4xl:grid-cols-[minmax(0,1fr)_250px]',
          )}
        >
          <div className="flex min-w-0 flex-col gap-3.5">
            {/* Masonry, not rows: a short card never leaves a gap beside a tall
                one. Padding, not margin, spaces it - a column drops margin at
                its foot - so one -mb cancels the trailing space either way. */}
            <div className="-mb-3.5 gap-3.5 *:break-inside-avoid *:pb-3.5 @2xl:columns-2">
              <div>
                <Funnel
                  summary={summary}
                  showSeen={showSeen}
                  collectsRsvp={collectsRsvp}
                />
              </div>
              <div>
                <ChannelsCard summary={summary} isSms={isSms} />
              </div>
              {collectsRsvp && (
                <div>
                  <RsvpCard summary={summary} />
                </div>
              )}
            </div>

            <ScheduleResultsGuests
              guests={guests}
              collectsRsvp={collectsRsvp}
              showSeen={showSeen}
              filter={filter}
              onFilterChange={setFilter}
              selectedId={selectedId}
              onSelect={setSelectedId}
              now={now}
              locale={locale}
              isRTL={isRTL}
            />
          </div>

          {selected && railOpen && (
            <section className="bg-card border-primary/30 hidden rounded-2xl border p-4 shadow-[0_10px_26px_rgba(42,12,58,0.1)] @4xl:block">
              <GuestJourney
                row={selected}
                now={now}
                locale={locale}
                onClose={() => setSelectedId(null)}
              />
            </section>
          )}
        </div>
      </div>

      <Sheet
        open={!!selected && !wide}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto rounded-t-2xl px-4 pt-5 pb-6"
        >
          <SheetTitle className="sr-only">{selected?.guestName}</SheetTitle>
          {selected && (
            <GuestJourney row={selected} now={now} locale={locale} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/**
 * Whether the results container is wide enough for the side rail. A callback
 * ref, because the root node changes when the empty state gives way to results.
 */
function useIsWide() {
  const [wide, setWide] = useState(false);
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setWide(entry.contentRect.width >= RAIL_MIN_WIDTH);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, wide] as const;
}

function ago(iso: string, now: Date, locale: string) {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const minutes = Math.round(
    (now.getTime() - new Date(iso).getTime()) / 60_000,
  );
  if (minutes < 60) return rtf.format(-Math.max(minutes, 0), 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 48) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.round(hours / 24), 'day');
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
    sentAt && ago(sentAt, now, locale),
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

function Bar({ value, className }: { value: number; className: string }) {
  return (
    <span className="bg-muted block h-2.5 overflow-hidden rounded-full @2xl:h-3">
      <span
        className={cn(
          'animate-fill-in block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:animate-none motion-reduce:transition-none',
          className,
        )}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </span>
  );
}

type Summary = ScheduleInteractionData['summary'];

/**
 * Audience, reached, seen, answered. Seen is drawn as a share of the
 * WhatsApp deliveries rather than of the audience, so its bar is a ratio that
 * can move either way as late failures leave that denominator. It is also a
 * floor, not a count: a guest who turned off read receipts never reports one,
 * and the row says so.
 */
function Funnel({
  summary,
  showSeen,
  collectsRsvp,
}: {
  summary: Summary;
  showSeen: boolean;
  collectsRsvp: boolean;
}) {
  const t = useTranslations('schedules.results.funnel');
  const answered = summary.confirmed + summary.declined;

  // Records the send skipped are not part of the audience, and the hint says which.
  const noPhone = summary.excludedNoPhone;
  const outside = summary.excludedOutsidePackage;
  const audienceHint =
    noPhone > 0 && outside > 0
      ? t('audienceExcludedBoth', { noPhone, outside })
      : outside > 0
        ? t('audienceExcludedPackage', { count: outside })
        : noPhone > 0
          ? t('audienceExcluded', { count: noPhone })
          : t('audienceHint');

  const rows = [
    {
      key: 'audience',
      label: t('audience'),
      hint: audienceHint,
      n: summary.audience,
      value: 100,
      bar: 'bg-muted-foreground/25',
      num: 'text-foreground',
      muted: true,
    },
    {
      key: 'reached',
      label: t('reached'),
      hint: t('ofAudience', {
        percent: percent(summary.reached, summary.audience),
      }),
      n: summary.reached,
      value: percent(summary.reached, summary.audience),
      bar: 'bg-primary',
      num: 'text-primary',
    },
    ...(showSeen
      ? [
          {
            key: 'seen',
            label: t('seen'),
            hint: t('seenHint', { count: summary.seenCapable }),
            n: summary.seen,
            value: percent(summary.seen, summary.seenCapable),
            bar: 'bg-primary/60',
            num: 'text-primary',
            note: t('seenNote'),
          },
        ]
      : []),
    ...(collectsRsvp
      ? [
          {
            key: 'answered',
            label: t('answered'),
            hint: t('answeredHint', {
              confirmed: summary.confirmed,
              declined: summary.declined,
            }),
            n: answered,
            value: percent(answered, summary.audience),
            bar: 'bg-rsvp-confirmed',
            num: 'text-rsvp-confirmed-strong',
          },
        ]
      : []),
  ];

  return (
    <section className="bg-card flex min-w-0 flex-col gap-3.5 rounded-2xl border p-4 @2xl:p-[18px]">
      <CardTitle title={t('title')} note={t('unit')} />
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'text-[13px] font-semibold @2xl:text-[13.5px]',
                row.muted && 'text-muted-foreground',
              )}
            >
              {row.label}
            </span>
            <span className="text-muted-foreground min-w-0 flex-1 truncate text-[11.5px] @2xl:text-xs">
              {row.hint}
            </span>
            <span
              className={cn(
                'text-[17px] font-extrabold tabular-nums @2xl:text-xl',
                row.num,
              )}
            >
              {row.n}
            </span>
          </div>
          <Bar value={row.value} className={row.bar} />
          {row.note && (
            <p className="text-muted-foreground text-[11.5px] leading-snug @2xl:text-xs">
              {row.note}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}

/**
 * How the schedule arrived: WhatsApp, SMS, and what has not arrived yet. On a
 * WhatsApp schedule the SMS row is SMS Fallback - Kululu taking care of the
 * guests WhatsApp could not reach. Before it has happened, those guests are an
 * SMS on its way rather than not delivered.
 */
function ChannelsCard({
  summary,
  isSms,
}: {
  summary: Summary;
  isSms: boolean;
}) {
  const t = useTranslations('schedules.results.channels');
  const whole = summary.audience;

  const rows = [
    {
      key: 'wa',
      label: t('whatsapp'),
      sub: t('whatsappSub'),
      n: summary.reachedWhatsapp,
      color: 'bg-channel-whatsapp',
    },
    {
      key: 'sms',
      label: t('sms'),
      sub: isSms ? t('smsScheduleSub') : t('smsFallbackSub'),
      n: summary.reachedSms,
      color: 'bg-channel-sms',
    },
    {
      key: 'smsWay',
      label: t('smsOnItsWay'),
      sub: isSms ? t('smsOnItsWayScheduleSub') : t('smsOnItsWaySub'),
      n: summary.notReached.smsOnItsWay,
      color: 'bg-channel-sms/45',
    },
    {
      key: 'way',
      label: t('onItsWay'),
      sub: t('onItsWaySub'),
      n: summary.notReached.onItsWay,
      color: 'bg-warning-solid',
    },
    {
      key: 'failed',
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
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2.5">
            <span
              className={cn('size-[9px] shrink-0 rounded-[3px]', row.color)}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[13px] font-semibold">{row.label}</span>
              <span className="text-muted-foreground text-[11.5px]">
                {row.sub}
              </span>
            </div>
            <span className="text-base font-extrabold tabular-nums @2xl:text-[17px]">
              {row.n}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Who is coming, headcount first. One record can be a whole family, so the
 * people figure is the headline and the records the supporting line.
 */
function RsvpCard({ summary }: { summary: Summary }) {
  const t = useTranslations('schedules.results.rsvp');
  const answered = summary.confirmed + summary.declined;
  const tiles = [
    { key: 'confirmed', n: summary.confirmed, tone: RESULT_TONE.ok },
    { key: 'declined', n: summary.declined, tone: RESULT_TONE.bad },
    // A shared link can answer without being reached, so this never goes negative.
    {
      key: 'noResponse',
      n: Math.max(summary.reached - answered, 0),
      tone: RESULT_TONE.neutral,
    },
  ];

  return (
    <section className="bg-card flex flex-col gap-3 rounded-2xl border p-4 @2xl:p-[18px]">
      <CardTitle
        title={t('title')}
        note={t('note', { answered, reached: summary.reached })}
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
          <div
            key={tile.key}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-[11px]',
              tile.tone,
            )}
          >
            <span className="text-xl font-extrabold tabular-nums">
              {tile.n}
            </span>
            <span className="text-center text-[11.5px] font-semibold">
              {t(tile.key)}
            </span>
          </div>
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

  const funnelRows = [
    { key: 'audience', bar: 'bg-muted-foreground/20', width: 'w-full' },
    { key: 'reached', bar: 'bg-primary/30', width: 'w-[82%]' },
    ...(isSms ? [] : [{ key: 'seen', bar: 'bg-primary/20', width: 'w-[60%]' }]),
    ...(collectsRsvp
      ? [{ key: 'answered', bar: 'bg-rsvp-confirmed/35', width: 'w-[38%]' }]
      : []),
  ];

  const channelRows = [
    ...(isSms
      ? []
      : [{ key: 'wa', color: 'bg-channel-whatsapp/35', width: 'w-[62%]' }]),
    ...(isSms || smsFallback
      ? [{ key: 'sms', color: 'bg-channel-sms/35', width: isSms ? 'w-[78%]' : 'w-[22%]' }]
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
        <div className="-mb-3.5 gap-3.5 *:break-inside-avoid *:pb-3.5 @2xl:columns-2">
          <div>
            <section className="bg-card flex flex-col gap-3.5 rounded-2xl border p-4 @2xl:p-[18px]">
              <CardTitle title={t('funnel.title')} />
              <GhostEmpty
                icon={<IconSend className="size-[18px]" strokeWidth={1.9} />}
                message={t('ghost.funnel')}
                overlayOffset={offset(44 * funnelRows.length + 10)}
                className="pb-6"
              >
                <div className="flex flex-col gap-3.5">
                  {funnelRows.map((row, i) => (
                    <div
                      key={row.key}
                      className={cn('flex flex-col gap-1.5', fade[i])}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(GHOST_BAR, 'h-[9px] w-14')} />
                        <span className={cn(GHOST_BAR, 'h-[7px] w-20')} />
                        <span className={cn(GHOST_BAR, 'ms-auto h-3.5 w-7')} />
                      </div>
                      <span className="bg-muted block h-2.5 overflow-hidden rounded-full @2xl:h-3">
                        <span
                          className={cn(
                            'block h-full rounded-full',
                            row.bar,
                            row.width,
                          )}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              </GhostEmpty>
            </section>
          </div>

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
                          <span className={cn('h-[7px] w-12 rounded-full', bar)} />
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
