'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { IconArrowBack, IconExternalLink } from '@tabler/icons-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/toggle-switch';

import {
  GIFT_BUTTON,
  NAVIGATION_BUTTON,
  RSVP_BUTTONS,
  isAskStage,
  type MessageButton,
} from '../message-plan';
import {
  attachmentOptions,
  giftAvailable,
  timingNote,
} from '../utils/message-plan-editor';
import { useMessagePlanSettings } from './message-plan-settings-context';
import { useScheduleSettings } from './schedule-settings-context';
import { SettingsCard } from './settings-card';

/**
 * What an Ask attaches (brief 6.2): the Event's invitation image, its video
 * (the Invitation only) or nothing. What the Event does not have is shown but
 * not offered, with the way to add it.
 */
export function MessagePlanAttachmentCard({ lockBadge }: { lockBadge?: ReactNode }) {
  const t = useTranslations('schedules.messagePlan.attachment');
  const { stage, event, attachment, setAttachment, editable, isSaving } =
    useMessagePlanSettings();
  if (!isAskStage(stage)) return null;

  const options = attachmentOptions(stage, event);
  const selectable = editable && !isSaving;

  return (
    <SettingsCard title={t('cardTitle')} aside={!editable ? lockBadge : undefined}>
      <div role="radiogroup" aria-label={t('cardTitle')} className="flex flex-col gap-2">
        {options.map((option) => {
          const checked = option.value === attachment;
          const enabled = selectable && option.available;
          return (
            <div
              key={option.value}
              className={cn(
                'flex flex-col gap-0.5 rounded-xl border-[1.5px] p-3',
                checked ? 'border-primary bg-primary/5' : 'border-border',
                !option.available && 'opacity-70',
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={checked}
                aria-disabled={!enabled}
                disabled={!enabled}
                onClick={() => setAttachment(option.value)}
                className={cn('text-start', enabled ? 'cursor-pointer' : 'cursor-default')}
              >
                <span className="text-sm font-semibold">{t(`options.${option.value}`)}</span>
              </button>
              {!option.available && option.value === 'image' && (
                <Link
                  href={`/app/${event.id}/details`}
                  className="text-primary text-xs font-semibold underline underline-offset-2"
                >
                  {t('addImage')}
                </Link>
              )}
              {!option.available && option.value === 'video' && (
                <span className="text-muted-foreground text-xs">{t('addVideo')}</span>
              )}
            </div>
          );
        })}
      </div>
    </SettingsCard>
  );
}

/**
 * The gift switch on the Reminder and the Thank You (brief 6.4). Offered only
 * once the Gifting page is set up; until then, the way to set it up.
 */
export function MessagePlanGiftCard({ lockBadge }: { lockBadge?: ReactNode }) {
  const t = useTranslations('schedules.messagePlan.gift');
  const { stage, event, giftButton, setGiftButton, editable, isSaving } =
    useMessagePlanSettings();
  if (isAskStage(stage)) return null;

  const available = giftAvailable(event);

  return (
    <SettingsCard title={t('cardTitle')} aside={!editable ? lockBadge : undefined}>
      <label className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{t('label')}</span>
          <span className="text-muted-foreground text-xs">
            {available ? t('description') : t('notSetUp')}
          </span>
        </span>
        <Switch
          checked={available && giftButton === true}
          onCheckedChange={setGiftButton}
          disabled={!editable || isSaving || !available}
        />
      </label>
      {!available && (
        <Link
          href={`/app/${event.id}/gifting`}
          className="text-primary text-xs font-semibold underline underline-offset-2"
        >
          {t('setUp')}
        </Link>
      )}
    </SettingsCard>
  );
}

/**
 * The buttons the message carries (brief 6.3): shown, never edited. They are
 * the same for Kululu's text and the Owner's own.
 */
export function MessagePlanButtonsCard() {
  const t = useTranslations('schedules.messagePlan.buttons');
  const { stage, event, giftButton } = useMessagePlanSettings();
  const gift = giftButton === true && giftAvailable(event);

  const buttons: readonly MessageButton[] = isAskStage(stage)
    ? RSVP_BUTTONS
    : stage === 'event_reminder'
      ? gift
        ? [NAVIGATION_BUTTON, GIFT_BUTTON]
        : [NAVIGATION_BUTTON]
      : gift
        ? [GIFT_BUTTON]
        : [];

  return (
    <SettingsCard title={t('cardTitle')}>
      {buttons.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {buttons.map((button) => (
            <li
              key={button.text}
              className="bg-muted/60 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
            >
              {button.kind === 'url' ? <IconExternalLink size={13} /> : <IconArrowBack size={13} />}
              {button.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs">{t('none')}</p>
      )}
      <p className="text-muted-foreground text-xs">{t(`help.${isAskStage(stage) ? 'ask' : stage}`)}</p>
    </SettingsCard>
  );
}

/**
 * The line under the timing card (brief 6.5): which Kululu wording the
 * Reminder's day gives, or why a Thank You after a Friday Event is on Sunday.
 */
export function MessagePlanTimingNote({ eventDate }: { eventDate: string | null }) {
  const t = useTranslations('schedules.messagePlan.timing');
  const { stage, wording } = useMessagePlanSettings();
  const { scheduledDate } = useScheduleSettings();
  const note = timingNote({ stage, eventDate, scheduledDate: scheduledDate || null, wording });
  if (!note) return null;
  return <p className="text-muted-foreground text-xs">{t(note)}</p>;
}
