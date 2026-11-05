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
  type MessageState,
} from '../utils/schedule-results';

/**
 * The guest list of a Schedule's Results, piece by piece: where each message
 * stands, the answer, and the message's activity - in a table row on desktop,
 * a list row and its sheet on a phone (Guest list status options, screens 7,
 * 9 and 11).
 */

/** The look of one state: a circle to sit an icon in, and the icon's colour */
type Look = 'neutral' | 'read' | 'failed' | 'confirmed' | 'declined';

const CIRCLE: Record<Look, string> = {
  neutral: 'border-border bg-muted text-foreground/70',
  read: 'border-border bg-muted text-info-strong',
  failed: 'border-warning-tint-border bg-warning-tint text-warning-strong',
  confirmed:
    'border-rsvp-confirmed-strong/25 bg-rsvp-confirmed-tint text-rsvp-confirmed-strong',
  declined:
    'border-rsvp-declined-strong/25 bg-rsvp-declined-tint text-rsvp-declined-strong',
};

const MESSAGE_LOOK: Record<MessageState, { icon: Icon; look: Look }> = {
  pending: { icon: IconClock, look: 'neutral' },
  sent: { icon: IconCheck, look: 'neutral' },
  received: { icon: IconChecks, look: 'neutral' },
  read: { icon: IconChecks, look: 'read' },
  failed: { icon: IconAlertTriangle, look: 'failed' },
  no_phone: { icon: IconPhoneOff, look: 'neutral' },
  outside_package: { icon: IconPackage, look: 'neutral' },
  none: { icon: IconMinus, look: 'neutral' },
};

/** A message state as text with its tick, for the table's Message column */
export function MessageStateLabel({ row }: { row: GuestInteractionRow }) {
  const t = useTranslations('schedules.results.guests.message');
  const state = messageState(row);
  if (state === 'none')
    return <span className="text-muted-foreground/60">–</span>;
  const { icon: StateIcon, look } = MESSAGE_LOOK[state];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[7px]',
        look === 'failed'
          ? 'text-warning-strong'
          : look === 'read'
            ? 'text-info-strong'
            : 'text-foreground/70',
      )}
    >
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
  const BadgeIcon =
    state === 'confirmed'
      ? IconUserCheck
      : state === 'declined'
        ? IconUserX
        : null;
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-[5px] rounded-full px-[9px] text-[13px] whitespace-nowrap',
        state === 'confirmed' &&
          'bg-rsvp-confirmed-tint text-rsvp-confirmed-strong font-semibold',
        state === 'declined' &&
          'bg-rsvp-declined-tint text-rsvp-declined-strong font-semibold',
        state === 'pending' && 'bg-muted text-foreground/70',
      )}
    >
      {BadgeIcon && <BadgeIcon size={14} aria-hidden />}
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

/**
 * One circle that says where the guest stands, for a phone's list row: the
 * answer when there is one, with the people it confirmed on a badge, and the
 * message's tick otherwise.
 */
export function GuestStatusAvatar({ row }: { row: GuestInteractionRow }) {
  const tMessage = useTranslations('schedules.results.guests.message');
  const tRsvp = useTranslations('schedules.results.guests.rsvp');
  const rsvp = rsvpState(row);
  const answered = rsvp === 'confirmed' || rsvp === 'declined';
  const state = messageState(row);
  const { icon: StateIcon, look } = answered
    ? rsvp === 'confirmed'
      ? { icon: IconUserCheck, look: 'confirmed' as const }
      : { icon: IconUserX, look: 'declined' as const }
    : MESSAGE_LOOK[state];
  const count = rsvp === 'confirmed' ? row.guestCount : undefined;
  const label = answered
    ? count
      ? `${tRsvp(rsvp)} ${count}`
      : tRsvp(rsvp)
    : tMessage(state);

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'relative flex size-9 shrink-0 items-center justify-center rounded-full border',
        CIRCLE[look],
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

type ActivityStep = {
  key: string;
  icon: Icon;
  look: Look;
  label: string;
  at?: string;
};

/**
 * The message's activity as the design tells it: sent, received, read, an
 * answer - one tick per step, no explanations. The steps come from
 * `buildJourney`, the same story the Guests page drawer tells in full.
 */
function useActivitySteps(row: GuestInteractionRow): ActivityStep[] {
  const t = useTranslations('schedules.results.activity');
  const look = (step: JourneyStep): Omit<ActivityStep, 'key' | 'at'> => {
    switch (step.kind) {
      case 'sent':
        return {
          icon: IconCheck,
          look: 'neutral',
          label: step.channel === 'sms' ? t('sentSms') : t('sent'),
        };
      case 'delivered':
        return { icon: IconChecks, look: 'neutral', label: t('delivered') };
      case 'seen':
        return { icon: IconChecks, look: 'read', label: t('read') };
      case 'not_delivered':
        return { icon: IconAlertTriangle, look: 'failed', label: t('failed') };
      case 'on_its_way':
        return { icon: IconClock, look: 'neutral', label: t('onItsWay') };
      case 'sms_on_its_way':
        return { icon: IconClock, look: 'neutral', label: t('smsOnItsWay') };
      case 'no_phone':
        return { icon: IconPhoneOff, look: 'neutral', label: t('noPhone') };
      case 'outside_package':
        return {
          icon: IconPackage,
          look: 'neutral',
          label: t('outsidePackage'),
        };
      case 'confirmed':
        return { icon: IconUserCheck, look: 'confirmed', label: t('answered') };
      case 'declined':
        return { icon: IconUserX, look: 'declined', label: t('answered') };
    }
  };
  return buildJourney(row).map((step, index) => ({
    key: `${step.kind}-${index}`,
    at: step.at,
    ...look(step),
  }));
}

function StepCircle({ step }: { step: ActivityStep }) {
  const StepIcon = step.icon;
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border',
        CIRCLE[step.look],
      )}
    >
      <StepIcon size={16} aria-hidden />
    </span>
  );
}

function StepTime({
  at,
  now,
  locale,
  className,
}: {
  at?: string;
  now: Date;
  locale: string;
  className?: string;
}) {
  if (!at) return null;
  return (
    <span
      title={formatMoment(at, { now, locale })}
      className={cn(
        'text-muted-foreground text-[13px] tabular-nums',
        className,
      )}
    >
      {formatAgo(at, { now, locale })}
    </span>
  );
}

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
              <StepTime at={step.at} now={now} locale={locale} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The activity down the page, the time at the end of each step, for the
 * phone's sheet and a narrow pane's expanded row (screen 9).
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
                <StepTime
                  at={step.at}
                  now={now}
                  locale={locale}
                  className="shrink-0"
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
 * bottom `SheetContent`, which brings the overlay and the swipe to close.
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
  const tPeople = useTranslations('schedules.results');
  const rsvp = rsvpState(row);

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
              <bdi
                dir="ltr"
                className="text-muted-foreground self-start text-sm tabular-nums"
              >
                {formatPhone(row.phone)}
              </bdi>
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
              rsvp === 'confirmed'
                ? 'bg-rsvp-confirmed-tint'
                : rsvp === 'declined'
                  ? 'bg-rsvp-declined-tint'
                  : 'bg-muted',
            )}
          >
            <span className="text-foreground/70 text-[13px]">{t('rsvp')}</span>
            <span
              className={cn(
                'text-[17px] font-bold',
                rsvp === 'confirmed' && 'text-rsvp-confirmed-strong',
                rsvp === 'declined' && 'text-rsvp-declined-strong',
              )}
            >
              {rsvp === 'confirmed'
                ? t('coming')
                : rsvp === 'declined'
                  ? t('notComing')
                  : t('noResponse')}
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
