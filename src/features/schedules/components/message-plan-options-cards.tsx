'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { IconArrowBack, IconExternalLink } from '@tabler/icons-react';

import { Link } from '@/i18n/navigation';
import { Switch } from '@/components/ui/toggle-switch';

import {
  GIFT_BUTTON,
  NAVIGATION_BUTTON,
  RSVP_BUTTONS,
  effectiveGift,
  isAskStage,
  type MessageButton,
} from '../message-plan';
import { isGiftingEnabled } from '../utils/event-config';
import { attachmentOptions, timingNote } from '../utils/message-plan-editor';
import { useDueTime } from './due-time-context';
import { useMessagePlanSettings } from './message-plan-settings-context';
import { RadioCardGroup } from './radio-card-group';
import { SettingsCard } from './settings-card';

/**
 * What an Ask attaches (brief 6.2): the Event's invitation image, its video
 * (the Invitation only) or nothing. What the Event does not have is shown but
 * not offered, with the way to add it. Rendered on the Asks only.
 */
export function MessagePlanAttachmentCard({ lockBadge }: { lockBadge?: ReactNode }) {
  const t = useTranslations('schedules.messagePlan.attachment');
  const { stage, event, attachment, setAttachment, editable, isSaving } =
    useMessagePlanSettings();
  if (!isAskStage(stage)) return null;

  return (
    <SettingsCard title={t('cardTitle')} aside={!editable ? lockBadge : undefined}>
      <RadioCardGroup
        label={t('cardTitle')}
        value={attachment}
        onChange={setAttachment}
        disabled={!editable || isSaving}
        options={attachmentOptions(stage, event).map((option) => ({
          value: option.value,
          label: t(`options.${option.value}`),
          disabled: !option.available,
          extra: option.available ? null : option.value === 'image' ? (
            <Link
              href={`/app/${event.id}/details`}
              className="text-primary text-xs font-semibold underline underline-offset-2"
            >
              {t('addImage')}
            </Link>
          ) : (
            <span className="text-muted-foreground text-xs">{t('addVideo')}</span>
          ),
        }))}
      />
    </SettingsCard>
  );
}

/**
 * The gift switch on the Reminder and the Thank You (brief 6.4). Offered only
 * once the Gifting page is set up; until then, the way to set it up.
 * Rendered on those two stages only.
 */
export function MessagePlanGiftCard({ lockBadge }: { lockBadge?: ReactNode }) {
  const t = useTranslations('schedules.messagePlan.gift');
  const { event, giftButton, setGiftButton, editable, isSaving } = useMessagePlanSettings();
  const available = isGiftingEnabled(event.eventSettings);

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
          checked={effectiveGift(giftButton, event)}
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
  const ask = isAskStage(stage);

  const buttons: readonly MessageButton[] = ask
    ? RSVP_BUTTONS
    : [
        ...(stage === 'event_reminder' ? [NAVIGATION_BUTTON] : []),
        ...(effectiveGift(giftButton, event) ? [GIFT_BUTTON] : []),
      ];

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
      <p className="text-muted-foreground text-xs">{t(`help.${ask ? 'ask' : stage}`)}</p>
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
  const { scheduledDate } = useDueTime();
  const note = timingNote({ stage, eventDate, scheduledDate: scheduledDate || null, wording });
  if (!note) return null;
  return <p className="text-muted-foreground text-xs">{t(note)}</p>;
}
