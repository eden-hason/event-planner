import { getLocale, getTranslations } from 'next-intl/server';
import { IconCheck, IconLock, IconPhone } from '@tabler/icons-react';

import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import { AutoRefresh } from '@/components/auto-refresh';
import { CheckList } from '@/features/schedules/components/check-list';
import { NoticeBanner, ServiceNote } from '@/features/schedules/components/notice-banner';
import { ScheduleFooter } from '@/features/schedules/components/schedule-footer';

import { getCallRoundResults } from '../queries/call-rounds';
import type { CallRoundSummary } from '../types';
import type { CallPaneState } from '../utils/pane-state';
import { CallAudienceCard } from './call-audience-card';
import { CallChecklistCard } from './call-checklist-card';
import { CallRoundGuestList } from './call-round-guest-list';
import { CallRoundResultsCard } from './call-round-results-card';
import { CallWhenCard } from './call-when-card';

/** What a planned round promises the Owner, in the order the hero lists it. */
const HERO_POINTS = ['audience', 'answer', 'retry'] as const;

interface CallRoundPaneProps {
  eventId: string;
  state: CallPaneState;
  /** The plan's Due Time. */
  scheduledDate: string;
  targetStatus: 'pending' | 'confirmed' | null;
  /** Null until an Operator presses Start. */
  round: CallRoundSummary | null;
  /** Who the plan would phone if the round started now. */
  audienceCount: number;
  /** Of those, how many have no phone number to call. */
  withoutPhone: number;
  /** This round's place among the Event's call rounds, and how many there are. */
  position: number;
  callRounds: number;
  /** Messages in the same plan, for the locked footer's "open together". */
  messageCount: number;
}

/**
 * One call round, opened: a single pane that grows over the round's life.
 *
 * Planned, live, done, locked and off are five faces of the same card rather
 * than five layouts - the date, the audience and the results keep their places
 * and each state adds or freezes something. It is read-only throughout: the
 * Owner does not run, edit or cancel a round, they plan around it and watch it
 * (docs/adr/0004-call-schedules-are-plans-call-rounds-are-executions.md), so
 * the only action anywhere here is the one that unlocks an unpaid plan.
 */
export async function CallRoundPane({
  eventId,
  state,
  scheduledDate,
  targetStatus,
  round,
  audienceCount,
  withoutPhone,
  position,
  callRounds,
  messageCount,
}: CallRoundPaneProps) {
  const t = await getTranslations('calls');
  const locale = await getLocale();

  const started = state === 'live' || state === 'done';
  const results = started && round ? await getCallRoundResults(round.id) : null;

  const dayMonth = new Intl.DateTimeFormat(locale, {
    timeZone: ADMIN_TIME_ZONE,
    day: 'numeric',
    month: 'numeric',
  });
  const clock = new Intl.DateTimeFormat(locale, {
    timeZone: ADMIN_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const dateAndTime = (iso: string) =>
    t('dateTime', {
      date: dayMonth.format(new Date(iso)),
      time: clock.format(new Date(iso)),
    });

  // A planned round has nothing to add to what the pane already says, so it has
  // no footer: the bar is for the one action a locked plan has, and for the
  // sentence that says what a live or finished round means.
  const footNote =
    state === 'locked'
      ? t('footer.locked', { calls: callRounds, messages: messageCount })
      : state === 'done'
        ? t('footer.done', { position, total: callRounds })
        : state === 'live'
          ? t('footer.live')
          : null;

  const top =
    state === 'live' ? (
      <NoticeBanner tone="info" icon={IconPhone} title={t('banner.live.title')}>
        {t('banner.live.body')}
      </NoticeBanner>
    ) : state === 'done' && round ? (
      <NoticeBanner tone="success" icon={IconCheck} title={t('banner.done.title')}>
        {round.completedAt
          ? t('banner.done.body', {
              start: dateAndTime(round.createdAt),
              end: dateAndTime(round.completedAt),
            })
          : t('banner.done.bodyOpen', { start: dateAndTime(round.createdAt) })}
      </NoticeBanner>
    ) : state === 'off' ? (
      <ServiceNote>{t('banner.off')}</ServiceNote>
    ) : (
      <>
        <div className="bg-card flex items-start gap-3 rounded-2xl border p-4">
          <span
            aria-hidden
            className="bg-info-tint text-info-strong flex size-9 shrink-0 items-center justify-center rounded-[11px]"
          >
            <IconPhone size={18} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-[15px] font-extrabold">
              {state === 'locked'
                ? t('hero.locked.title', { count: callRounds })
                : t('hero.title')}
            </span>
            {state === 'locked' ? (
              <span className="text-muted-foreground text-[13px] leading-relaxed text-pretty">
                {t('hero.locked.body')}
              </span>
            ) : (
              <CheckList items={HERO_POINTS.map((point) => t(`hero.points.${point}`))} />
            )}
          </div>
        </div>
        {state === 'locked' && (
          <NoticeBanner tone="warning" icon={IconLock} title={t('banner.locked.title')}>
            {t('banner.locked.body')}
          </NoticeBanner>
        )}
      </>
    );

  const audience =
    state === 'off' ? null : (
      <CallAudienceCard
        state={state}
        targetStatus={targetStatus}
        count={started && round ? round.total : audienceCount}
        scheduledDate={scheduledDate}
        startedDate={round?.createdAt ?? null}
      />
    );

  // A round that has started is a results screen: the headline and the guest
  // list are the page, and the date and audience sit beside them. A plan that
  // has not is a short explanation with two facts, so it stays one column.
  const body =
    started && round && results ? (
      <div className="flex flex-col gap-4 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_280px] 2xl:items-start 2xl:gap-x-[18px]">
        <div className="flex flex-col gap-4 2xl:col-span-2">{top}</div>
        <div className="2xl:col-start-1 2xl:row-start-2">
          <CallRoundResultsCard round={round} results={results} />
        </div>
        <div className="flex flex-col gap-4 2xl:col-start-2 2xl:row-span-2 2xl:row-start-2">
          <CallWhenCard scheduledDate={scheduledDate} state={state} />
          {audience}
          <ServiceNote className="hidden 2xl:flex">{t('service')}</ServiceNote>
        </div>
        <div className="2xl:col-start-1 2xl:row-start-3">
          <CallRoundGuestList guests={results.guests} />
        </div>
      </div>
    ) : (
      <div className="flex flex-col gap-4">
        {top}
        <CallWhenCard scheduledDate={scheduledDate} state={state} />
        {audience}
        {state === 'planned' && <CallChecklistCard eventId={eventId} withoutPhone={withoutPhone} />}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {/* Outcomes land as the team logs each call; no push, so a live round polls */}
      {state === 'live' && <AutoRefresh />}
      {body}
      {footNote && <ScheduleFooter note={footNote} upgrade={state === 'locked'} aboveNav />}
    </div>
  );
}
