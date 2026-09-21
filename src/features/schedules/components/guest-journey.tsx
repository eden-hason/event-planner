'use client';

import { useTranslations } from 'next-intl';
import {
  IconAlertTriangle,
  IconCheck,
  IconChecks,
  IconClock,
  IconHeart,
  IconMessage,
  IconPhone,
  IconPhoneOff,
  IconSend,
  IconX,
  type Icon,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import type { GuestInteractionRow } from '../queries/guest-interactions';
import {
  buildJourney,
  formatMoment,
  type JourneyStep,
} from '../utils/schedule-results';
import {
  RESULT_TONE,
  useAnswerMeta,
  type ResultTone,
} from './results-presentation';

function stepLook(step: JourneyStep): { icon: Icon; tone: ResultTone } {
  switch (step.kind) {
    case 'sent':
      return step.channel === 'sms'
        ? { icon: IconMessage, tone: 'info' }
        : { icon: IconSend, tone: 'ok' };
    case 'delivered':
      return { icon: IconCheck, tone: 'ok' };
    case 'seen':
      return { icon: IconChecks, tone: 'ok' };
    case 'confirmed':
      return { icon: IconHeart, tone: 'ok' };
    case 'declined':
      return { icon: IconX, tone: 'bad' };
    case 'not_delivered':
      return { icon: IconAlertTriangle, tone: 'bad' };
    case 'on_its_way':
      return { icon: IconClock, tone: 'pending' };
    case 'no_phone':
      return { icon: IconPhoneOff, tone: 'neutral' };
  }
}

/** The guest's channel as one phrase: "WhatsApp", "SMS", "SMS after WhatsApp" */
export function useChannelLabel() {
  const t = useTranslations('schedules.results.guests.channel');
  return (row: GuestInteractionRow) => {
    if (row.delivery === 'no_phone') return t('notSent');
    if (row.viaFallback) return t('fallback');
    if (row.delivery === 'sms') return t('sms');
    if (row.delivery === null) return null;
    return t('whatsapp');
  };
}

/**
 * One guest's timeline: every message on every channel, then what they did
 * with it. Drawn in the rail beside the list on a wide pane, in a sheet on a
 * narrow one - the caller decides where, this is only the content.
 */
export function GuestJourney({
  row,
  now,
  locale,
  onClose,
}: {
  row: GuestInteractionRow;
  now: Date;
  locale: string;
  /** Draws a close button in the header; a sheet brings its own */
  onClose?: () => void;
}) {
  const t = useTranslations('schedules.results');
  const answerMeta = useAnswerMeta();
  const channelLabel = useChannelLabel();
  const steps = buildJourney(row);

  const describe = (step: JourneyStep): { label: string; meta: string } => {
    switch (step.kind) {
      case 'sent':
        return step.channel === 'sms'
          ? {
              label: t('journey.sentSms'),
              meta: step.fallback
                ? t('journey.sentFallbackMeta')
                : t('journey.smsMeta'),
            }
          : { label: t('journey.sentWhatsapp'), meta: '' };
      case 'delivered':
        return {
          label: t('journey.delivered'),
          meta: t('journey.deliveredMeta'),
        };
      case 'seen':
        return { label: t('journey.seen'), meta: t('journey.seenMeta') };
      case 'not_delivered':
        return {
          label: t('journey.notDelivered'),
          meta:
            step.channel === 'sms'
              ? t('journey.notDeliveredSms')
              : t('journey.notDeliveredWhatsapp'),
        };
      case 'on_its_way':
        return {
          label: t('journey.onItsWay'),
          meta: t('journey.onItsWayMeta'),
        };
      case 'no_phone':
        return { label: t('journey.noPhone'), meta: t('journey.noPhoneMeta') };
      case 'confirmed':
        return {
          label: t('journey.confirmed'),
          meta: answerMeta(step.guestCount, step.mealCounts),
        };
      case 'declined':
        return { label: t('journey.declined'), meta: '' };
    }
  };

  const answer =
    row.response === 'rsvp_confirm'
      ? [
          t('guests.answer.confirmed'),
          row.guestCount ? t('people', { count: row.guestCount }) : '',
        ]
          .filter(Boolean)
          .join(', ')
      : row.response === 'rsvp_decline'
        ? t('guests.answer.declined')
        : null;
  const sub = [channelLabel(row), answer].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15.5px] font-extrabold">
            {row.guestName}
          </span>
          {sub && <span className="text-muted-foreground text-xs">{sub}</span>}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('journey.close')}
            className="bg-muted text-muted-foreground hover:text-foreground flex size-[26px] shrink-0 items-center justify-center rounded-lg"
          >
            <IconX size={14} />
          </button>
        )}
      </div>

      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const { icon: StepIcon, tone } = stepLook(step);
          const { label, meta } = describe(step);
          const last = index === steps.length - 1;
          return (
            <li key={`${step.kind}-${index}`} className="flex gap-2.5 pb-3">
              <div className="relative flex w-[22px] shrink-0 justify-center">
                {!last && (
                  <span className="bg-muted absolute top-6 bottom-0 w-0.5" />
                )}
                <span
                  className={cn(
                    'z-[1] flex size-[22px] items-center justify-center rounded-full',
                    RESULT_TONE[tone],
                  )}
                >
                  <StepIcon size={12} stroke={2.2} />
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="text-[13px] font-semibold">{label}</span>
                {meta && (
                  <span className="text-muted-foreground text-[11.5px]">
                    {meta}
                  </span>
                )}
              </div>
              {step.at && (
                <span className="text-muted-foreground shrink-0 text-[11.5px] tabular-nums">
                  {formatMoment(step.at, { now, locale })}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {row.phone && (
        <Button
          asChild
          variant="outline"
          className="h-10 rounded-[11px] text-[13px] font-semibold"
        >
          <a href={`tel:${row.phone}`}>
            <IconPhone size={15} />
            {t('journey.call')}
          </a>
        </Button>
      )}
    </div>
  );
}
