'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconInfoCircle,
  IconMessage,
} from '@tabler/icons-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { stageOffersTable, type RenderRefusal } from '../message-plan';
import type { PreviewGuest } from '../utils/message-plan-editor';
import { composeMessagePlanForGuest } from '../utils/message-plan-send';
import { useMessagePlanSettings } from './message-plan-settings-context';
import {
  MessageBody,
  PhoneFrame,
  PreviewVideo,
  SmsBubble,
  WhatsAppBubble,
} from './message-preview';
import { SettingsCard } from './settings-card';

type Channel = 'whatsapp' | 'sms';

/**
 * Exactly what a Guest gets on the current Message Plan, on WhatsApp and by
 * SMS (brief 8), composed the way the send composes it
 * (`composeMessagePlanForGuest`) from the Schedule as it stands unsaved, for
 * one typical Guest (`previewGuest`). A message that cannot be rendered says
 * why instead of showing nothing.
 */
export function MessagePlanPreview({
  guest,
  siteUrl,
  previewToken,
}: {
  guest: PreviewGuest;
  siteUrl: string;
  previewToken: string | null;
}) {
  const t = useTranslations('schedules.messagePlan.preview');
  const tPreview = useTranslations('schedules.messagePreview');
  const { event, stage, previewSchedule, document: doc, wording } = useMessagePlanSettings();
  const [channel, setChannel] = useState<Channel>('whatsapp');

  const composed = useMemo(
    () =>
      composeMessagePlanForGuest({
        schedule: previewSchedule,
        event,
        guest,
        table: guest.table ? { tableNumber: guest.table.tableNumber, label: guest.table.label ?? null } : null,
        confirmationToken: previewToken ?? 'preview',
        siteUrl,
      }),
    [guest, previewSchedule, event, siteUrl, previewToken],
  );

  const offersTable = stageOffersTable(stage);
  const sentenceDropped =
    offersTable && wording === 'personal' && doc.tableSentence !== null && guest.table === null;

  return (
    <SettingsCard
      title={tPreview('cardTitle')}
      aside={<span className="text-muted-foreground/80 text-[11.5px]">{tPreview('hint')}</span>}
    >
      <div className="flex">
        <div role="tablist" aria-label={t('channel')} className="bg-muted flex shrink-0 rounded-lg p-0.5">
          {(['whatsapp', 'sms'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={channel === option}
              onClick={() => setChannel(option)}
              className={cn(
                'flex h-8 items-center gap-1 rounded-md px-3 text-xs font-semibold',
                channel === option ? 'bg-card shadow-xs' : 'text-muted-foreground',
              )}
            >
              {option === 'whatsapp' ? <IconBrandWhatsapp size={14} /> : <IconMessage size={14} />}
              {t(`channels.${option}`)}
            </button>
          ))}
        </div>
      </div>

      {offersTable && (
        <p className="text-muted-foreground text-xs">
          {guest.table ? t('seatedAt', { table: guest.table.tableNumber }) : t('noTable')}
        </p>
      )}

      <PhoneFrame channel={channel}>
        {!composed.ok ? (
          <RefusalState refusal={composed.refusal} eventId={event.id} />
        ) : channel === 'sms' ? (
          <SmsBubble body={composed.message.smsBody} />
        ) : (
          <WhatsAppBubble
            buttons={composed.message.buttons.map(({ button }) => ({
              text: button.text,
              url: button.kind === 'url',
            }))}
          >
            {composed.message.header?.type === 'image' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={composed.message.header.link}
                alt=""
                className="h-auto w-full rounded-t-xl p-1.5 pb-0"
              />
            )}
            {composed.message.header?.type === 'video' && (
              <PreviewVideo src={composed.message.header.link} playLabel={tPreview('playVideo')} />
            )}
            <div className="px-3 py-2">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-800" dir="rtl">
                <MessageBody body={composed.message.body} />
              </p>
            </div>
          </WhatsAppBubble>
        )}
      </PhoneFrame>

      {sentenceDropped && (
        <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
          <IconInfoCircle className="mt-px size-3.5 shrink-0" />
          {t('tableSentenceDropped')}
        </p>
      )}
      {channel === 'sms' && <p className="text-muted-foreground text-xs">{t('smsHelp')}</p>}
    </SettingsCard>
  );
}

/** Why there is no message to show, as the Owner can act on it. */
function RefusalState({ refusal, eventId }: { refusal: RenderRefusal; eventId: string }) {
  const t = useTranslations('schedules.messagePlan.preview.refusal');
  const tDetails = useTranslations('schedules.messagePreview.missingFields.fields');

  let body: React.ReactNode;
  switch (refusal.reason) {
    case 'missing_details':
      body = (
        <>
          {t('missingDetails', {
            details: refusal.details.map((detail) => tDetails(detail)).join(', '),
          })}{' '}
          <Link href={`/app/${eventId}/details`} className="font-semibold underline underline-offset-2">
            {t('detailsLink')}
          </Link>
        </>
      );
      break;
    case 'no_due_time':
      body = t('noDueTime');
      break;
    case 'reminder_after_event':
      body = t('reminderAfterEvent');
      break;
    case 'no_short_code':
    case 'missing_link':
      body = t('noLinks');
      break;
    default:
      body = t('other');
  }

  return (
    <div className="border-warning-tint-border bg-warning-tint text-warning-strong flex items-start gap-2 rounded-xl border px-3 py-3 text-xs leading-relaxed">
      <IconAlertTriangle size={15} className="mt-px shrink-0" />
      <span>{body}</span>
    </div>
  );
}
