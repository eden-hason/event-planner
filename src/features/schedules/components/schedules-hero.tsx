'use client';

import { useTranslations } from 'next-intl';
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconCrown,
  IconLock,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { useBillingSheet } from '@/features/billing';

import type {
  HeroAttention,
  HeroFocus,
  HeroModel,
  HeroSegment,
} from '../utils/hero';
import { STATUS_TONE } from './schedule-status-chip';

type UnlockedModel = Extract<HeroModel, { locked: false }>;

/** The card's two-column split from md up, shared by both of its states. */
const SPLIT =
  'md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:items-center md:gap-5';

const SEGMENT: Record<HeroSegment, string> = {
  sent: 'bg-success',
  scheduled: 'bg-violet-strong/35',
  off: 'bg-muted',
};

interface SchedulesHeroProps {
  model: HeroModel;
  eventId: string;
  /** Opens a Schedule's pane, the same way picking its card does. */
  onOpen: (scheduleId: string) => void;
}

/**
 * The top of the schedules page: is the plan on its way, and does anything
 * need the Owner.
 *
 * One card in one tree. Below md it stacks - stepper, the attention line, then
 * the Schedule that matters now. From md up it splits in two: the stepper and
 * the attention line on the start side, that Schedule on the end side.
 */
export function SchedulesHero({ model, eventId, onOpen }: SchedulesHeroProps) {
  if (model.locked) return <LockedHero total={model.total} />;

  const { focus, attention } = model;

  return (
    <section
      className={cn(
        'bg-card flex flex-col overflow-hidden rounded-[18px] border md:p-[18px]',
        focus && SPLIT,
      )}
    >
      <div className="flex min-w-0 flex-col">
        <Stepper model={model} />
        {attention && (
          <AttentionRow
            attention={attention}
            eventId={eventId}
            onOpen={onOpen}
          />
        )}
      </div>
      {focus && (
        <div className="min-w-0 px-3 pb-3 md:border-s md:p-0 md:ps-5">
          <FocusCard focus={focus} onOpen={onOpen} />
        </div>
      )}
    </section>
  );
}

function Stepper({ model }: { model: UnlockedModel }) {
  const t = useTranslations('schedules.hero');
  const { counts, total } = model;

  const sub =
    counts.sent === total
      ? t('complete')
      : [
          counts.scheduled ? t('scheduled', { count: counts.scheduled }) : null,
          counts.undated ? t('undated', { count: counts.undated }) : null,
          counts.skipped ? t('skipped', { count: counts.skipped }) : null,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <StepperFrame
      num={counts.sent}
      rest={t('ofSent', { total })}
      sub={sub}
      segments={model.segments}
    />
  );
}

function StepperFrame({
  num,
  rest,
  sub,
  segments,
}: {
  num: number;
  rest: string;
  sub: string;
  segments: HeroSegment[];
}) {
  return (
    <div className="flex flex-col gap-2.5 p-4 pb-3.5 md:gap-3 md:p-0">
      <div className="flex items-end justify-between gap-2.5">
        <div className="flex items-baseline gap-1.5 md:gap-[7px]">
          <span className="text-[32px] leading-none font-extrabold tracking-tight md:text-4xl">
            {num}
          </span>
          <span className="text-[15px] font-bold md:text-base">{rest}</span>
        </div>
        <span className="text-muted-foreground pb-0.5 text-end text-[12.5px] md:text-[13px]">
          {sub}
        </span>
      </div>
      <div className="flex gap-1 md:gap-[5px]">
        {segments.map((segment, index) => (
          <span
            key={index}
            className={cn('h-2 flex-1 rounded-full', SEGMENT[segment])}
          />
        ))}
      </div>
    </div>
  );
}

function AttentionRow({
  attention,
  eventId,
  onOpen,
}: {
  attention: HeroAttention;
  eventId: string;
  onOpen: (scheduleId: string) => void;
}) {
  const t = useTranslations('schedules.hero.attention');

  const className = cn(
    'mx-3 mb-3 flex min-h-12 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start text-[13px]',
    'bg-warning-tint border-warning-tint-border text-warning-strong',
    'hover:border-warning-solid/60 transition-colors md:mx-0 md:mt-3 md:mb-0 md:min-h-0 md:py-[9px] md:text-[13.5px]',
  );

  const body = (
    <>
      <span
        aria-hidden
        className="bg-warning-solid/35 flex size-7 shrink-0 items-center justify-center rounded-full"
      >
        <IconAlertTriangle size={15} stroke={2} />
      </span>
      <span className="min-w-0 flex-1 leading-snug font-semibold text-pretty">
        {attention.kind === 'noAsk' ? (
          <>
            {t('noAsk.main')}
            <span className="font-normal">{t('noAsk.tail')}</span>
          </>
        ) : (
          t('tables.main', { count: attention.count, label: attention.label })
        )}
      </span>
      <span className="hidden text-[12.5px] font-bold whitespace-nowrap md:inline">
        {t(`${attention.kind}.go`)}
      </span>
      <IconChevronRight
        aria-hidden
        size={16}
        stroke={2}
        className="shrink-0 rtl:rotate-180"
      />
    </>
  );

  if (attention.kind === 'tables') {
    return (
      <Link href={`/app/${eventId}/seating`} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(attention.scheduleId)}
      className={className}
    >
      {body}
    </button>
  );
}

function FocusCard({
  focus,
  onOpen,
}: {
  focus: HeroFocus;
  onOpen: (scheduleId: string) => void;
}) {
  const t = useTranslations('schedules.hero');
  const tTimeline = useTranslations('schedules.timeline');

  if (focus.kind === 'done') {
    return (
      <button
        type="button"
        onClick={() => onOpen(focus.scheduleId)}
        className="bg-muted/60 hover:bg-muted flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start transition-colors md:gap-[11px] md:px-3.5 md:py-3"
      >
        <FocusChip className={STATUS_TONE.sent}>
          <IconCheck size={15} stroke={2.2} />
        </FocusChip>
        <FocusText
          title={t('done.title')}
          sub={
            focus.finishedOn
              ? t('done.sub', { label: focus.label, date: focus.finishedOn })
              : focus.label
          }
        />
        <span className="text-violet-strong text-xs font-semibold whitespace-nowrap">
          {t('done.link')}
        </span>
      </button>
    );
  }

  const live = focus.kind === 'live';

  return (
    <div className="bg-muted/60 flex items-center gap-2.5 rounded-xl px-3 py-2.5 md:gap-[11px] md:px-3.5 md:py-3">
      <FocusChip className={STATUS_TONE[live ? 'in_progress' : 'pending']}>
        {live ? (
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full rounded-full bg-current opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2.5 rounded-full bg-current" />
          </span>
        ) : (
          <IconClock size={15} stroke={2} />
        )}
      </FocusChip>
      <FocusText
        eyebrow={
          live
            ? t('liveLabel')
            : focus.datedOnly
              ? t('nextDatedLabel')
              : t('nextLabel')
        }
        title={
          live || focus.audienceCount === null
            ? focus.label
            : `${focus.label} · ${tTimeline('recipientCount', { count: focus.audienceCount })}`
        }
      />
      <span
        className={cn(
          'text-xs font-semibold whitespace-nowrap md:text-[12.5px]',
          live ? 'text-info-strong' : 'text-violet-strong',
        )}
      >
        {live
          ? t('handled', { handled: focus.handled, total: focus.total })
          : focus.when}
      </span>
    </div>
  );
}

function FocusChip({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-[30px] shrink-0 items-center justify-center rounded-[9px] md:size-[34px] md:rounded-[10px]',
        className,
      )}
    >
      {children}
    </span>
  );
}

function FocusText({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-px">
      {eyebrow && (
        <span className="text-muted-foreground text-[11.5px] md:text-xs">
          {eyebrow}
        </span>
      )}
      <span className="truncate text-[13.5px] font-bold md:text-sm">
        {title}
      </span>
      {sub && (
        <span className="text-muted-foreground text-[11.5px]">{sub}</span>
      )}
    </div>
  );
}

/**
 * A plan seeded for an Event that cannot send yet. The stepper stays, dimmed,
 * so the Owner sees the shape of what is waiting; the lock card says why it is
 * waiting. The upgrade action is for whoever would pay, so a collaborator gets
 * the explanation without a button they cannot use.
 */
function LockedHero({ total }: { total: number }) {
  const t = useTranslations('schedules.hero');
  const tUpsell = useTranslations('schedules.upsell');
  const { canPrompt, openSheet, sheet } = useBillingSheet();

  return (
    <section
      className={cn(
        'bg-card flex flex-col overflow-hidden rounded-[18px] border md:p-[18px]',
        SPLIT,
      )}
    >
      <div aria-hidden className="min-w-0 opacity-60 saturate-[.35]">
        <StepperFrame
          num={0}
          rest={t('ofActive', { total })}
          sub={t('waiting')}
          segments={Array.from({ length: total }, () => 'off' as const)}
        />
      </div>
      <div className="bg-muted/60 mx-3 mb-3 flex flex-col gap-3 rounded-[14px] p-3.5 md:m-0 md:items-start md:gap-2 md:rounded-none md:border-s md:bg-transparent md:p-0 md:ps-5">
        <div className="flex items-center gap-2.5 md:gap-[9px]">
          <span
            aria-hidden
            className="bg-card text-primary md:bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-[10px] md:size-[30px] md:rounded-[9px]"
          >
            <IconLock size={16} stroke={2} />
          </span>
          <span className="text-[14.5px] font-extrabold">
            {tUpsell('title')}
          </span>
        </div>
        {/* Under the title on mobile (past the 32px chip and its gap), under
            the whole row on desktop. */}
        <span className="text-muted-foreground -mt-2.5 ps-[42px] text-[12.5px] leading-normal text-pretty md:mt-0 md:ps-0">
          {tUpsell('description', { count: total })}
        </span>
        {canPrompt && (
          <Button
            type="button"
            onClick={openSheet}
            className="rounded-xl text-[15px] font-bold md:rounded-[11px] md:text-sm"
          >
            <IconCrown aria-hidden size={16} stroke={2} />
            {tUpsell('cta')}
          </Button>
        )}
      </div>
      {sheet}
    </section>
  );
}
