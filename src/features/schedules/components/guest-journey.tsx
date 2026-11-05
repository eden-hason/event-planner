'use client';

import { useTranslations } from 'next-intl';
import {
  IconAlertTriangle,
  IconCheck,
  IconChecks,
  IconClock,
  IconHeart,
  IconMessage,
  IconPackage,
  IconPhoneOff,
  IconSend,
  IconX,
  type Icon,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';

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
    case 'sms_on_its_way':
      return { icon: IconMessage, tone: 'pending' };
    case 'no_phone':
      return { icon: IconPhoneOff, tone: 'neutral' };
    case 'outside_package':
      return { icon: IconPackage, tone: 'pending' };
  }
}

const FALLBACK_META = {
  failed: 'journey.sentFallbackMeta',
  unconfirmed: 'journey.sentFallbackUnconfirmedMeta',
} as const;

/**
 * The steps alone - sent, delivered, seen, answered - for a view already
 * about this guest, such as the guest drawer's Messages tab.
 */
export function GuestJourneySteps({
  row,
  now,
  locale,
}: {
  row: GuestInteractionRow;
  now: Date;
  locale: string;
}) {
  const t = useTranslations('schedules.results');
  const answerMeta = useAnswerMeta();
  const steps = buildJourney(row);
  // An SMS already accepted and waiting on its report, as opposed to a
  // Fallback the sweeper has yet to send.
  const smsAwaitingReport = row.steps.some(
    (step) => step.channel === 'sms' && !step.failedAt && !step.deliveredAt,
  );

  const describe = (step: JourneyStep): { label: string; meta: string } => {
    switch (step.kind) {
      case 'sent':
        return step.channel === 'sms'
          ? {
              label: t('journey.sentSms'),
              // An unconfirmed WhatsApp may still arrive, and its receipt can
              // land after this step, so it never claims WhatsApp failed.
              meta: step.fallback ? t(FALLBACK_META[step.fallback]) : '',
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
      case 'sms_on_its_way':
        return {
          label: t('journey.smsOnItsWay'),
          meta: smsAwaitingReport
            ? t('journey.onItsWayMeta')
            : t('journey.smsOnItsWayMeta'),
        };
      case 'no_phone':
        return { label: t('journey.noPhone'), meta: t('journey.noPhoneMeta') };
      case 'outside_package':
        return {
          label: t('journey.outsidePackage'),
          meta: t('journey.outsidePackageMeta'),
        };
      case 'confirmed':
        return {
          label: t('journey.confirmed'),
          meta: answerMeta(step.guestCount, step.mealCounts),
        };
      case 'declined':
        return { label: t('journey.declined'), meta: '' };
    }
  };

  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const { icon: StepIcon, tone } = stepLook(step);
        const { label, meta } = describe(step);
        const last = index === steps.length - 1;
        return (
          <li key={`${step.kind}-${index}`} className="flex gap-2.5 pb-3">
            <div className="relative flex w-[22px] shrink-0 justify-center">
              {!last && (
                // Icon to icon: from this one's foot, through the step's
                // bottom padding (pb-3), to the top of the next
                <span className="bg-muted-foreground/30 absolute top-[22px] -bottom-3 w-0.5" />
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
  );
}
