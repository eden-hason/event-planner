'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import {
  IconCircleCheck,
  IconCircleX,
  IconHeadset,
  IconPencil,
  IconSend,
} from '@tabler/icons-react';
import { Skeleton } from '@/components/ui/skeleton';
import { loadGuestActivity } from '@/features/guests/actions/activity';
import type { GuestActivityItem } from '@/features/guests/utils/guest-activity';
import { cn } from '@/lib/utils';

const KNOWN_SCHEDULES = [
  'initial_invitation',
  'confirmation',
  'event_reminder',
  'post_event',
];

type State = { guestId: string; items: GuestActivityItem[] | null } | null;

/**
 * The drawer's read-only Activity: Deliveries, Call Outcomes and RSVP changes
 * for one Guest Record, newest first. Loaded after the drawer opens, so it
 * never holds the drawer up.
 */
export function GuestActivity({ guestId }: { guestId: string }) {
  const t = useTranslations('guests.list');
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    let live = true;
    loadGuestActivity(guestId)
      .then((items) => live && setState({ guestId, items }))
      .catch(() => live && setState({ guestId, items: null }));
    return () => {
      live = false;
    };
  }, [guestId]);

  const loading = state?.guestId !== guestId;
  const items = loading ? null : state.items;

  return (
    <section className="flex flex-col gap-2.5 border-t pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-muted-foreground text-xs font-bold tracking-[0.02em]">
          {t('drawer.activity')}
        </h3>
        {!loading && items && items.length > 0 && (
          <span className="text-muted-foreground text-[11.5px]">
            {t('drawer.newestFirst')}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3.5" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Skeleton className="size-7 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-2.5 w-[62%]" />
                <Skeleton className="h-2 w-[38%]" />
              </div>
              <Skeleton className="h-2 w-[52px]" />
            </div>
          ))}
        </div>
      ) : items === null ? (
        <div className="bg-muted text-muted-foreground rounded-xl p-3.5 text-center text-[13.5px]">
          {t('drawer.activityFailed')}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-muted text-muted-foreground rounded-xl p-3.5 text-center text-[13.5px]">
          {t('drawer.activityEmpty')}
        </div>
      ) : (
        <ol className="flex flex-col">
          {items.map((item, index) => (
            <ActivityRow
              key={index}
              item={item}
              last={index === items.length - 1}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function ActivityRow({
  item,
  last,
}: {
  item: GuestActivityItem;
  last: boolean;
}) {
  const t = useTranslations('guests.list.activity');
  const { icon: Icon, tone, title, meta, sub } = describe(item, t);

  return (
    <li className="flex gap-[11px]">
      <div className="flex shrink-0 flex-col items-center">
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-full',
            tone,
          )}
        >
          <Icon size={15} />
        </span>
        <span
          className={cn(
            'min-h-2.5 w-[1.5px] flex-1',
            last ? 'bg-transparent' : 'bg-border',
          )}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px] pt-1 pb-3.5">
        <div className="flex justify-between gap-2.5">
          <span className="text-[13.5px] leading-snug font-semibold">
            {title}
          </span>
          {item.at && (
            <span className="text-muted-foreground text-[11.5px] whitespace-nowrap tabular-nums">
              <bdi>{format(new Date(item.at), 'd.M · HH:mm')}</bdi>
            </span>
          )}
        </div>
        {meta && <span className="text-muted-foreground text-xs">{meta}</span>}
        {sub && (
          <span className="bg-muted text-muted-foreground mt-0.5 self-start rounded-md px-2 py-[3px] text-[11.5px]">
            {sub}
          </span>
        )}
      </div>
    </li>
  );
}

type T = ReturnType<typeof useTranslations<'guests.list.activity'>>;

const TONE = {
  delivery: 'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
  call: 'bg-violet-tint text-violet-strong',
  yes: 'bg-rsvp-confirmed-tint text-rsvp-confirmed-strong',
  no: 'bg-rsvp-declined-tint text-rsvp-declined-strong',
  neutral: 'bg-muted text-muted-foreground',
};

function describe(item: GuestActivityItem, t: T) {
  switch (item.kind) {
    case 'delivery': {
      const schedule = KNOWN_SCHEDULES.includes(item.scheduleTypeKey)
        ? t(`schedule.${item.scheduleTypeKey}` as 'schedule.confirmation')
        : t('schedule.other');
      return {
        icon: IconSend,
        tone: TONE.delivery,
        title: t('delivery', {
          schedule,
          outcome: t(`outcome.${item.outcome}`),
        }),
        meta: item.channel
          ? t(item.channel === 'sms' ? 'viaSms' : 'viaWhatsapp')
          : null,
        sub: item.viaFallback ? t('fallback') : null,
      };
    }
    case 'call':
      return {
        icon: IconHeadset,
        tone: TONE.call,
        title: t('call', { round: item.roundNumber }),
        meta: `${t(`callOutcome.${item.outcome}`)} · ${t('callBy')}`,
        sub: null,
      };
    case 'answer':
      return {
        icon: item.response === 'confirmed' ? IconCircleCheck : IconCircleX,
        tone: item.response === 'confirmed' ? TONE.yes : TONE.no,
        title:
          item.response === 'confirmed'
            ? t('answerConfirmed', { count: item.count ?? 0 })
            : t('answerDeclined'),
        meta: t(item.channel === 'whatsapp' ? 'answerInChat' : 'answerOnPage'),
        sub: null,
      };
    case 'rsvp':
      return {
        icon: IconPencil,
        tone: TONE.neutral,
        title: item.countOnly
          ? t('manualCount', { count: item.amount })
          : item.status === 'confirmed'
            ? t('manualConfirmed', { count: item.amount })
            : t('manual', { status: t(`manualStatus.${item.status}`) }),
        meta: item.byCurrentUser ? t('manualByYou') : item.byName,
        sub: null,
      };
  }
}
