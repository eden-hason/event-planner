'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { Switch } from '@/components/ui/toggle-switch';
import { cn } from '@/lib/utils';

import { effectiveAttachment, effectiveGift, isAskStage } from '../message-plan';
import { isGiftingEnabled } from '../utils/event-config';
import { timingNote } from '../utils/message-plan-editor';
import { useDueTime } from './due-time-context';
import { useMessagePlanSettings } from './message-plan-settings-context';
import { ATTACHMENT_ICONS } from './attachment-icons';
import { SettingsCard } from './settings-card';

/**
 * What an Ask attaches: the invitation image, the video (the Invitation only)
 * or nothing. Chosen on the Event details page, beside the files themselves,
 * so it is shown here with the way there. What would actually go out is the
 * renderer's own rule (`effectiveAttachment`): a choice whose file is gone
 * reads as missing. Rendered on the Asks only.
 */
export function MessagePlanAttachmentCard({ lockBadge }: { lockBadge?: ReactNode }) {
  const t = useTranslations('schedules.messagePlan.attachment');
  const { stage, event, attachment, editable } = useMessagePlanSettings();
  if (!isAskStage(stage)) return null;

  const chosen = attachment ?? 'none';
  const missing = chosen !== 'none' && effectiveAttachment(stage, chosen, event) !== chosen;
  const Icon = ATTACHMENT_ICONS[chosen];

  return (
    <SettingsCard title={t('cardTitle')} aside={!editable ? lockBadge : undefined}>
      <div className="bg-muted/50 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3">
        <span className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg',
              chosen === 'none' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
            )}
          >
            <Icon size={18} />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{t(`options.${chosen}`)}</span>
            {missing && <span className="text-warning-ink text-xs">{t('missing')}</span>}
          </span>
        </span>
        {editable && (
          <Link
            href={`/app/${event.id}/details`}
            className="text-primary shrink-0 text-xs font-semibold underline underline-offset-2"
          >
            {t('change')}
          </Link>
        )}
      </div>
      <p className="text-muted-foreground text-xs">{t('help')}</p>
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
