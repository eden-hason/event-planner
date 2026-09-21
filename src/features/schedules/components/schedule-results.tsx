'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconAlertTriangle,
  IconChecks,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconEye,
  IconHeart,
  IconMessage,
  IconX,
  type Icon,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { AutoRefresh } from '@/components/auto-refresh';
import { RefreshButton } from '@/components/refresh-button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

import type { ScheduleInteractionData } from '../queries/guest-interactions';
import {
  buildActivityFeed,
  formatMoment,
  percent,
  resultsLiveness,
  type ActivityItem,
  type GuestFilter,
  type NotReachedFilter,
} from '../utils/schedule-results';
import { GuestJourney } from './guest-journey';
import {
  RESULT_TONE,
  useAnswerMeta,
  type ResultTone,
} from './results-presentation';
import { ScheduleResultsGuests } from './schedule-results-guests';

/** Feed entries younger than this arrive highlighted. */
const FRESH_MS = 2 * 60_000;
const FEED_LIMIT = 8;
/** The results container width (px) at which the side rail appears - Tailwind's `@4xl`. */
const RAIL_MIN_WIDTH = 896;

interface ScheduleResultsProps {
  data: ScheduleInteractionData;
  collectsRsvp: boolean;
  channel: 'whatsapp' | 'sms' | null;
  sentAt?: string;
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
  renderedAt,
}: ScheduleResultsProps) {
  const t = useTranslations('schedules.results');
  const locale = useLocale();
  const isRTL = locale === 'he';
  const now = useMemo(() => new Date(renderedAt), [renderedAt]);
  const { summary, guests } = data;

  const [filter, setFilter] = useState<GuestFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const guestsRef = useRef<HTMLElement>(null);
  const [rootRef, wide] = useIsWide();

  const isSms = channel === 'sms';
  // Scored against WhatsApp deliveries only, so shown only when there are some.
  const showSeen = !isSms && summary.seenCapable > 0;
  // A page view comes from the link in the message. A Confirmation always
  // carries one; other types show it only once someone has actually opened it.
  const showViews = collectsRsvp || summary.views > 0;

  const liveness = resultsLiveness({
    sentAt,
    onItsWay: summary.notReached.onItsWay,
    collectsRsvp,
    now,
  });

  const selected = guests.find((g) => g.guestId === selectedId) ?? null;
  const feed = useMemo(() => buildActivityFeed(guests, FEED_LIMIT), [guests]);

  const pickReason = (reason: NotReachedFilter) => {
    setFilter(reason);
    guestsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const live = (
    <LiveStrip
      liveness={liveness}
      sentAt={sentAt}
      onItsWay={summary.notReached.onItsWay}
      now={now}
      locale={locale}
    />
  );

  if (guests.length === 0) {
    return (
      <div ref={rootRef} className="flex flex-col gap-3">
        {live}
        <section className="bg-card flex flex-col items-center gap-3 rounded-2xl border px-5 py-8 text-center">
          <span className="bg-muted text-muted-foreground flex size-[60px] items-center justify-center rounded-[18px]">
            <IconClock size={28} stroke={1.7} />
          </span>
          <span className="text-base font-bold">{t('empty.title')}</span>
          <span className="text-muted-foreground max-w-[280px] text-[13px] leading-relaxed">
            {t('empty.description')}
          </span>
        </section>
      </div>
    );
  }

  const notReached = (
    <NotReachedCard
      counts={summary.notReached}
      active={filter}
      onPick={pickReason}
      isRTL={isRTL}
    />
  );
  const activity = (
    <ActivityFeed
      items={feed}
      now={now}
      locale={locale}
      onSelect={setSelectedId}
    />
  );

  return (
    <div ref={rootRef} className="@container">
      <div className="flex flex-col gap-3.5">
        {live}

        <div className="grid gap-3.5 @4xl:grid-cols-[minmax(0,1fr)_250px] @4xl:items-start">
          <div className="flex min-w-0 flex-col gap-3.5">
            <div className="grid gap-3.5 @2xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] @2xl:items-start">
              <Funnel
                summary={summary}
                showSeen={showSeen}
                showViews={showViews}
                collectsRsvp={collectsRsvp}
              />
              <div className="flex min-w-0 flex-col gap-3.5">
                <ChannelsCard summary={summary} isSms={isSms} />
                {collectsRsvp && <RsvpCard summary={summary} />}
              </div>
            </div>

            {/* Below the rail's width, what the rail holds sits here, above the list */}
            <div className="flex flex-col gap-3.5 @4xl:hidden">
              {notReached}
              {activity}
            </div>

            <ScheduleResultsGuests
              ref={guestsRef}
              guests={guests}
              collectsRsvp={collectsRsvp}
              showSeen={showSeen}
              showViews={showViews}
              filter={filter}
              onFilterChange={setFilter}
              selectedId={selectedId}
              onSelect={setSelectedId}
              now={now}
              locale={locale}
              isRTL={isRTL}
            />
          </div>

          <div className="hidden flex-col gap-3.5 @4xl:flex">
            {selected && wide && (
              <section className="bg-card border-primary/30 rounded-2xl border p-4 shadow-[0_10px_26px_rgba(42,12,58,0.1)]">
                <GuestJourney
                  row={selected}
                  now={now}
                  locale={locale}
                  onClose={() => setSelectedId(null)}
                />
              </section>
            )}
            {notReached}
            {activity}
          </div>
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
 * Audience, reached, seen, opened, answered. Seen is drawn as a share of the
 * WhatsApp deliveries rather than of the audience, so its bar is a ratio that
 * can move either way as late failures leave that denominator.
 */
function Funnel({
  summary,
  showSeen,
  showViews,
  collectsRsvp,
}: {
  summary: Summary;
  showSeen: boolean;
  showViews: boolean;
  collectsRsvp: boolean;
}) {
  const t = useTranslations('schedules.results.funnel');
  const answered = summary.confirmed + summary.declined;

  const rows = [
    {
      key: 'audience',
      label: t('audience'),
      hint:
        summary.excludedNoPhone > 0
          ? t('audienceExcluded', { count: summary.excludedNoPhone })
          : t('audienceHint'),
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
          },
        ]
      : []),
    ...(showViews
      ? [
          {
            key: 'opened',
            label: t('opened'),
            hint: t('ofAudience', {
              percent: percent(summary.views, summary.audience),
            }),
            n: summary.views,
            value: percent(summary.views, summary.audience),
            bar: 'bg-home-violet',
            num: 'text-violet-strong',
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
        </div>
      ))}
    </section>
  );
}

/**
 * How the schedule arrived: WhatsApp, SMS, and what has not arrived yet. On a
 * WhatsApp schedule the SMS row is SMS Fallback - Kululu taking care of the
 * guests WhatsApp could not reach - and says so, once it has happened.
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
      {!isSms && summary.reachedByFallback > 0 && (
        <span className="bg-info-tint text-info-strong rounded-[10px] px-3 py-2.5 text-xs leading-relaxed">
          {t('fallbackNote', { count: summary.reachedByFallback })}
        </span>
      )}
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
 * Who the message has not reached, by reason. Each reason filters the guest
 * list to the people behind it - the ones worth a personal call.
 */
function NotReachedCard({
  counts,
  active,
  onPick,
  isRTL,
}: {
  counts: Summary['notReached'];
  active: GuestFilter;
  onPick: (reason: NotReachedFilter) => void;
  isRTL: boolean;
}) {
  const t = useTranslations('schedules.results.notReached');
  const rows = [
    {
      key: 'on_its_way' as const,
      label: t('onItsWay'),
      why: t('onItsWayWhy'),
      n: counts.onItsWay,
      dot: 'bg-warning-solid',
    },
    {
      key: 'not_delivered' as const,
      label: t('notDelivered'),
      why: t('notDeliveredWhy'),
      n: counts.notDelivered,
      dot: 'bg-destructive',
    },
    {
      key: 'no_phone' as const,
      label: t('noPhone'),
      why: t('noPhoneWhy'),
      n: counts.noPhone,
      dot: 'bg-muted-foreground/50',
    },
  ].filter((row) => row.n > 0);
  if (rows.length === 0) return null;

  const total = rows.reduce((sum, row) => sum + row.n, 0);
  const Chevron = isRTL ? IconChevronLeft : IconChevronRight;

  return (
    <section className="bg-card overflow-hidden rounded-2xl border">
      <div className="px-4 pt-3.5 pb-2.5">
        <CardTitle title={t('title')} note={t('total', { count: total })} />
      </div>
      {rows.map((row) => (
        <button
          key={row.key}
          type="button"
          aria-pressed={active === row.key}
          onClick={() => onPick(row.key)}
          className={cn(
            'hover:bg-muted/50 flex w-full items-center gap-2.5 border-t px-4 py-[11px] text-start transition-colors',
            active === row.key && 'bg-muted/60',
          )}
        >
          <span className={cn('size-2 shrink-0 rounded-full', row.dot)} />
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-[13.5px] font-semibold">{row.label}</span>
            <span className="text-muted-foreground text-[11.5px]">
              {row.why}
            </span>
          </div>
          <span className="text-base font-extrabold tabular-nums">{row.n}</span>
          <Chevron size={15} className="text-muted-foreground/50 shrink-0" />
        </button>
      ))}
    </section>
  );
}

const FEED_LOOK: Record<
  ActivityItem['kind'],
  { icon: Icon; tone: ResultTone }
> = {
  confirmed: { icon: IconHeart, tone: 'ok' },
  declined: { icon: IconX, tone: 'bad' },
  opened: { icon: IconEye, tone: 'violet' },
  seen: { icon: IconChecks, tone: 'info' },
  sms: { icon: IconMessage, tone: 'info' },
  not_delivered: { icon: IconAlertTriangle, tone: 'bad' },
};

/** The newest movements across the schedule. Tapping one opens that guest. */
function ActivityFeed({
  items,
  now,
  locale,
  onSelect,
}: {
  items: ActivityItem[];
  now: Date;
  locale: string;
  onSelect: (guestId: string) => void;
}) {
  const t = useTranslations('schedules.results.feed');
  const answerMeta = useAnswerMeta();

  const meta = (item: ActivityItem) => {
    switch (item.kind) {
      case 'confirmed':
        return answerMeta(item.guestCount, item.mealCounts);
      case 'seen':
        return t('whatsapp');
      case 'sms':
        return t('smsMeta');
      case 'not_delivered':
        return item.channel === 'sms'
          ? t('notDeliveredSms')
          : t('notDeliveredWhatsapp');
      default:
        return '';
    }
  };

  const what = {
    confirmed: t('confirmed'),
    declined: t('declined'),
    opened: t('opened'),
    seen: t('seen'),
    sms: t('sms'),
    not_delivered: t('notDelivered'),
  };

  return (
    <section className="bg-card flex flex-col gap-3 rounded-2xl border p-4">
      <CardTitle
        title={t('title')}
        note={
          items[0]
            ? t('lastAt', {
                when: formatMoment(items[0].at, {
                  now,
                  locale,
                  relative: true,
                }),
              })
            : undefined
        }
      />
      {items.length === 0 ? (
        <p className="text-muted-foreground text-[13px]">{t('empty')}</p>
      ) : (
        <ol className="flex flex-col">
          {items.map((item, index) => {
            const { icon: ItemIcon, tone } = FEED_LOOK[item.kind];
            const fresh =
              now.getTime() - new Date(item.at).getTime() < FRESH_MS;
            const line = meta(item);
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onSelect(item.guestId)}
                  className={cn(
                    'hover:bg-muted/40 -mx-1.5 flex w-[calc(100%+0.75rem)] gap-2.5 rounded-lg px-1.5 pb-3 text-start',
                    fresh && 'row-updated motion-reduce:animate-none',
                  )}
                >
                  <div className="relative flex w-[26px] shrink-0 justify-center">
                    {index < items.length - 1 && (
                      <span className="bg-muted absolute top-7 -bottom-0 w-0.5" />
                    )}
                    <span
                      className={cn(
                        'z-[1] flex size-[26px] items-center justify-center rounded-full',
                        RESULT_TONE[tone],
                      )}
                    >
                      <ItemIcon size={13} stroke={2.1} />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="text-[13px] leading-snug">
                      <strong className="font-bold">{item.guestName}</strong>{' '}
                      {what[item.kind]}
                    </span>
                    {line && (
                      <span className="text-muted-foreground text-[11.5px]">
                        {line}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground shrink-0 text-[11.5px] whitespace-nowrap">
                    {formatMoment(item.at, { now, locale, relative: true })}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
