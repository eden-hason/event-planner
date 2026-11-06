'use client';

import { useTranslations } from 'next-intl';
import {
  IconAlertTriangle,
  IconCheck,
  IconChecks,
  IconClock,
  IconMinus,
  IconPackage,
  IconPhoneOff,
  IconUserCheck,
  IconUserX,
  IconX,
  type Icon,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { formatPhone } from '@/lib/phone';
import {
  SheetClose,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';

import type { GuestInteractionRow } from '../queries/guest-interactions';
import {
  buildJourney,
  formatAgo,
  formatMoment,
  messageState,
  rsvpState,
  type JourneyStep,
  type JourneyStepKind,
  type MessageState,
} from '../utils/schedule-results';
import { RESULT_TONE } from './results-presentation';

/**
 * The guest list of a Schedule's Results, piece by piece: where each message
 * stands, the answer, and the message's activity - in a table row on desktop,
 * a list row and its sheet on a phone (Guest list status options, screens 7,
 * 9 and 11).
 */

/**
 * The looks a state can take. `tone` is a tint with its ink, plus an edge
 * colour that shows wherever the element draws a border (the circles); `ink`
 * is the ink alone, for text with an icon.
 */
type Look = 'neutral' | 'read' | 'failed' | 'confirmed' | 'declined';

const LOOK: Record<Look, { tone: string; ink: string }> = {
  neutral: {
    tone: 'border-border bg-muted text-foreground/70',
    ink: 'text-foreground/70',
  },
  read: {
    tone: 'border-border bg-muted text-info-strong',
    ink: 'text-info-strong',
  },
  failed: {
    tone: `${RESULT_TONE.pending} border-warning-tint-border`,
    ink: 'text-warning-strong',
  },
  confirmed: {
    tone: `${RESULT_TONE.ok} border-rsvp-confirmed-strong/25`,
    ink: 'text-rsvp-confirmed-strong',
  },
  declined: {
    tone: `${RESULT_TONE.bad} border-rsvp-declined-strong/25`,
    ink: 'text-rsvp-declined-strong',
  },
};

type StateLook = { icon: Icon; look: Look };

/** Each message state's tick, wherever it is drawn */
const MESSAGE_LOOK: Record<MessageState, StateLook> = {
  pending: { icon: IconClock, look: 'neutral' },
  sent: { icon: IconCheck, look: 'neutral' },
  received: { icon: IconChecks, look: 'neutral' },
  read: { icon: IconChecks, look: 'read' },
  failed: { icon: IconAlertTriangle, look: 'failed' },
  no_phone: { icon: IconPhoneOff, look: 'neutral' },
  outside_package: { icon: IconPackage, look: 'neutral' },
  none: { icon: IconMinus, look: 'neutral' },
};

/** Each answer's mark, wherever it is drawn */
const RSVP_LOOK: Record<'confirmed' | 'declined', StateLook> = {
  confirmed: { icon: IconUserCheck, look: 'confirmed' },
  declined: { icon: IconUserX, look: 'declined' },
};

/** A message state as text with its tick, for the table's Message column */
export function MessageStateLabel({ row }: { row: GuestInteractionRow }) {
  const t = useTranslations('schedules.results.guests.message');
  const state = messageState(row);
  if (state === 'none')
    return <span className="text-muted-foreground/60">–</span>;
  const { icon: StateIcon, look } = MESSAGE_LOOK[state];
  return (
    <span className={cn('inline-flex items-center gap-[7px]', LOOK[look].ink)}>
      <StateIcon size={16} aria-hidden />
      {t(state)}
    </span>
  );
}

/** The answer as a pill; a dash for a guest the Schedule did not ask */
export function RsvpBadge({ row }: { row: GuestInteractionRow }) {
  const t = useTranslations('schedules.results.guests.rsvp');
  const state = rsvpState(row);
  if (state === 'not_asked')
    return <span className="text-muted-foreground/60">–</span>;
  const answer = state === 'pending' ? null : RSVP_LOOK[state];
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-[5px] rounded-full px-[9px] text-[13px] whitespace-nowrap',
        answer ? `${LOOK[answer.look].tone} font-semibold` : LOOK.neutral.tone,
      )}
    >
      {answer && <answer.icon size={14} aria-hidden />}
      {t(state)}
    </span>
  );
}

/** The people an answer confirmed, or a dash */
export function ConfirmedCount({ row }: { row: GuestInteractionRow }) {
  return row.response === 'rsvp_confirm' && row.guestCount ? (
    <span className="font-bold tabular-nums">{row.guestCount}</span>
  ) : (
    <span className="text-muted-foreground/60 font-bold">–</span>
  );
}

/** A guest's number, LTR inside a RTL row and kept to the start edge under the name */
export function GuestPhone({
  phone,
  className,
}: {
  phone?: string;
  className?: string;
}) {
  if (!phone) return null;
  return (
    <bdi dir="ltr" className={cn('self-start tabular-nums', className)}>
      {formatPhone(phone)}
    </bdi>
  );
}

/** "5 minutes ago", with the exact moment on hover; `fallback` when there is no moment */
export function RelativeMoment({
  at,
  now,
  locale,
  fallback,
  className,
}: {
  at?: string;
  now: Date;
  locale: string;
  fallback?: string;
  className?: string;
}) {
  if (!at)
    return fallback ? <span className={className}>{fallback}</span> : null;
  return (
    <span title={formatMoment(at, { now, locale })} className={className}>
      {formatAgo(at, { now, locale })}
    </span>
  );
}

/**
 * One circle that says where the guest stands, for a phone's list row: the
 * answer when there is one, with the people it confirmed on a badge, and the
 * message's tick otherwise.
 */
export function GuestStatusAvatar({ row }: { row: GuestInteractionRow }) {
  const tMessage = useTranslations('schedules.results.guests.message');
  const tRsvp = useTranslations('schedules.results.guests.rsvp');
  const rsvp = rsvpState(row);
  const state = messageState(row);
  const answered = rsvp === 'confirmed' || rsvp === 'declined';
  const { icon: StateIcon, look } = answered
    ? RSVP_LOOK[rsvp]
    : MESSAGE_LOOK[state];
  const count = rsvp === 'confirmed' ? row.guestCount : undefined;
  const label = answered
    ? [tRsvp(rsvp), count].filter(Boolean).join(' ')
    : tMessage(state);

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'relative flex size-9 shrink-0 items-center justify-center rounded-full border',
        LOOK[look].tone,
      )}
    >
      <StateIcon size={18} aria-hidden />
      {!!count && (
        <span className="border-card bg-rsvp-confirmed-strong absolute -end-[5px] -top-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 px-1 text-[11px] leading-none font-bold text-white">
          {count}
        </span>
      )}
    </span>
  );
}

/**
 * The journey steps that read as a message state, and which one. The rest -
 * an SMS on its way and the answers - have their own words.
 */
const STEP_STATE: Record<
  Exclude<JourneyStepKind, 'sms_on_its_way' | 'confirmed' | 'declined'>,
  MessageState
> = {
  sent: 'sent',
  delivered: 'received',
  seen: 'read',
  not_delivered: 'failed',
  on_its_way: 'pending',
  no_phone: 'no_phone',
  outside_package: 'outside_package',
};

type ActivityStep = StateLook & { key: string; label: string; at?: string };

/**
 * The message's activity as the design tells it: sent, received, read, an
 * answer - one tick per step, no explanations, in the same looks and words as
 * the message states. The steps come from `buildJourney`, the same story the
 * Guests page drawer tells in full.
 */
function useActivitySteps(row: GuestInteractionRow): ActivityStep[] {
  const t = useTranslations('schedules.results.activity');
  const tMessage = useTranslations('schedules.results.guests.message');
  const describe = (step: JourneyStep): StateLook & { label: string } => {
    switch (step.kind) {
      case 'confirmed':
      case 'declined':
        return { ...RSVP_LOOK[step.kind], label: t('answered') };
      case 'sms_on_its_way':
        return { ...MESSAGE_LOOK.pending, label: t('smsOnItsWay') };
      default: {
        const state = STEP_STATE[step.kind];
        const viaSms = step.kind === 'sent' && step.channel === 'sms';
        return {
          ...MESSAGE_LOOK[state],
          label: viaSms ? t('sentSms') : tMessage(state),
        };
      }
    }
  };
  return buildJourney(row).map((step, index) => ({
    key: `${step.kind}-${index}`,
    at: step.at,
    ...describe(step),
  }));
}

function StepCircle({ step }: { step: ActivityStep }) {
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border',
        LOOK[step.look].tone,
      )}
    >
      <step.icon size={16} aria-hidden />
    </span>
  );
}

const STEP_TIME = 'text-muted-foreground text-[13px] tabular-nums';

/**
 * The activity across the row, step after step, for a desktop table's
 * expanded row (screen 11).
 */
export function MessageActivityStrip({
  row,
  now,
  locale,
}: {
  row: GuestInteractionRow;
  now: Date;
  locale: string;
}) {
  const t = useTranslations('schedules.results.activity');
  const steps = useActivitySteps(row);
  return (
    <div className="flex flex-col gap-3.5">
      <h4 className="text-foreground/70 text-[13px] font-bold">{t('title')}</h4>
      <ol
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${Math.max(steps.length, 4)}, minmax(0, 1fr))`,
        }}
      >
        {steps.map((step, index) => (
          <li key={step.key} className="flex flex-col gap-2">
            <div className="flex items-center">
              <StepCircle step={step} />
              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className="bg-muted-foreground/30 h-0.5 flex-1"
                />
              )}
            </div>
            <div className="flex flex-col gap-0.5 pe-3">
              <span className="text-sm font-semibold">{step.label}</span>
              <RelativeMoment
                at={step.at}
                now={now}
                locale={locale}
                className={STEP_TIME}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The activity down the page, the time at the end of each step, for the
 * phone's sheet and a narrow desktop table's expanded row (screen 9).
 */
export function MessageActivityList({
  row,
  now,
  locale,
}: {
  row: GuestInteractionRow;
  now: Date;
  locale: string;
}) {
  const t = useTranslations('schedules.results.activity');
  const steps = useActivitySteps(row);
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold">{t('title')}</h3>
      <ol>
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          return (
            <li
              key={step.key}
              className={cn('flex gap-3', last ? 'h-8' : 'h-[54px]')}
            >
              <div className="flex w-8 flex-col items-center">
                <StepCircle step={step} />
                {!last && (
                  <span
                    aria-hidden
                    className="bg-muted-foreground/30 w-0.5 flex-1"
                  />
                )}
              </div>
              <div className="flex h-8 flex-1 items-center justify-between gap-3">
                <span className="text-[15px] font-semibold">{step.label}</span>
                <RelativeMoment
                  at={step.at}
                  now={now}
                  locale={locale}
                  className={cn(STEP_TIME, 'shrink-0')}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * The phone's sheet for one guest (screen 9): name and number, the answer and
 * the people it confirmed, then the message's activity. Rendered inside a
 * bottom `SheetContent`, which brings the overlay and closes on a tap outside
 * or Escape; the handle is drawn, not dragged.
 */
export function GuestDetailsSheetBody({
  row,
  collectsRsvp,
  now,
  locale,
}: {
  row: GuestInteractionRow;
  collectsRsvp: boolean;
  now: Date;
  locale: string;
}) {
  const t = useTranslations('schedules.results.details');
  const tRsvp = useTranslations('schedules.results.guests.rsvp');
  const tPeople = useTranslations('schedules.results');
  const rsvp = rsvpState(row);
  const answer =
    rsvp === 'confirmed' || rsvp === 'declined' ? RSVP_LOOK[rsvp] : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <div
        aria-hidden
        className="bg-border h-[5px] w-11 self-center rounded-full"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-[3px]">
          <SheetTitle className="text-xl font-bold">{row.guestName}</SheetTitle>
          <SheetDescription asChild>
            {row.phone ? (
              <GuestPhone
                phone={row.phone}
                className="text-muted-foreground text-sm"
              />
            ) : (
              <span className="sr-only">{row.guestName}</span>
            )}
          </SheetDescription>
        </div>
        <SheetClose
          aria-label={t('close')}
          className="bg-muted text-foreground/70 hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg"
        >
          <IconX size={18} />
        </SheetClose>
      </div>

      {collectsRsvp && rsvp !== 'not_asked' && (
        <div className="grid grid-cols-2 gap-2">
          <div
            className={cn(
              'flex flex-col gap-1 rounded-xl p-3',
              answer ? LOOK[answer.look].tone : 'bg-muted',
            )}
          >
            <span className="text-foreground/70 text-[13px]">{t('rsvp')}</span>
            <span className="text-[17px] font-bold">
              {rsvp === 'confirmed' ? t('coming') : tRsvp(rsvp)}
            </span>
          </div>
          <div className="bg-muted flex flex-col gap-1 rounded-xl p-3">
            <span className="text-foreground/70 text-[13px]">
              {t('confirmedCount')}
            </span>
            <span className="text-[17px] font-bold">
              {rsvp === 'confirmed' && row.guestCount
                ? tPeople('people', { count: row.guestCount })
                : '–'}
            </span>
          </div>
        </div>
      )}

      <MessageActivityList row={row} now={now} locale={locale} />
    </div>
  );
}
