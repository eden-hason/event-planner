'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconAlertTriangle,
  IconArrowBack,
  IconBrandWhatsapp,
  IconExternalLink,
  IconInfoCircle,
  IconMessage,
} from '@tabler/icons-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  buildMessageLinks,
  composeMessage,
  stageOffersTable,
  type RenderRefusal,
} from '../message-plan';
import type { PreviewGuest } from '../utils/message-plan-editor';
import { useMessagePlanSettings } from './message-plan-settings-context';
import { MessageBody, PreviewVideo, SENDER_NAME, chatBgStyle } from './message-preview';
import { SettingsCard } from './settings-card';

type Channel = 'whatsapp' | 'sms';

/**
 * Exactly what a Guest gets on the current Message Plan, on WhatsApp and by
 * SMS (brief 8), rendered by the send's own `composeMessage` from the
 * Schedule as it stands unsaved. A Guest picker shows any Guest's message:
 * a typical seated one by default, one with no table, the longest name. A
 * message that cannot be rendered says why instead of showing nothing.
 */
export function MessagePlanPreview({
  presets,
  others,
  siteUrl,
  previewToken,
}: {
  presets: PreviewGuest[];
  others: PreviewGuest[];
  siteUrl: string;
  previewToken: string | null;
}) {
  const t = useTranslations('schedules.messagePlan.preview');
  const tPreview = useTranslations('schedules.messagePreview');
  const locale = useLocale();
  const { event, stage, previewSchedule, document: doc, wording } = useMessagePlanSettings();
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [guestId, setGuestId] = useState(presets[0]?.id ?? '');

  const guests = useMemo(() => [...presets, ...others], [presets, others]);
  const guest = guests.find((candidate) => candidate.id === guestId) ?? guests[0];

  const composed = useMemo(() => {
    if (!guest) return null;
    return composeMessage({
      schedule: previewSchedule,
      event,
      guest: { name: guest.name, table: guest.table },
      links: buildMessageLinks({
        siteUrl,
        shortCode: event.shortCode,
        confirmationToken: previewToken ?? 'preview',
      }),
      confirmationToken: null,
    });
  }, [guest, previewSchedule, event, siteUrl, previewToken]);

  const tagLabel = (candidate: PreviewGuest) =>
    candidate.tags.length
      ? `${candidate.name} · ${candidate.tags.map((tag) => t(`tags.${tag}`)).join(' · ')}`
      : candidate.name;

  const offersTable = stageOffersTable(stage);
  const sentenceDropped =
    offersTable && wording === 'personal' && doc.tableSentence !== null && guest?.table === null;

  return (
    <SettingsCard
      title={tPreview('cardTitle')}
      aside={<span className="text-muted-foreground/80 text-[11.5px]">{tPreview('hint')}</span>}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-muted-foreground text-xs">{t('guest')}</span>
          <Select value={guest?.id} onValueChange={setGuestId} dir={locale === 'he' ? 'rtl' : 'ltr'}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {presets.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {tagLabel(candidate)}
                  </SelectItem>
                ))}
              </SelectGroup>
              {others.length > 0 && (
                <SelectGroup>
                  <SelectLabel>{t('allGuests')}</SelectLabel>
                  {others.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>
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

      {offersTable && guest && (
        <p className="text-muted-foreground text-xs">
          {guest.table ? t('seatedAt', { table: guest.table.tableNumber }) : t('noTable')}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border">
        {channel === 'whatsapp' && (
          <div className="flex items-center gap-2.5 bg-[#075E54] px-3 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kululu-logo-mark.svg" alt="" aria-hidden className="size-[30px] shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13.5px] font-semibold text-white">{SENDER_NAME}</span>
              <span className="text-[11px] text-white/70">{tPreview('business')}</span>
            </div>
          </div>
        )}
        <div
          className={cn('flex flex-col gap-1 px-3 py-4', channel === 'sms' && 'bg-zinc-50')}
          style={channel === 'sms' ? undefined : chatBgStyle}
        >
          {!composed ? null : !composed.ok ? (
            <RefusalState refusal={composed.refusal} eventId={event.id} />
          ) : channel === 'sms' ? (
            <div className="relative max-w-[85%] self-end rtl:self-start">
              <div className="rounded-xl bg-zinc-200 px-3 py-2 shadow-sm">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-800" dir="rtl">
                  <MessageBody body={composed.message.smsBody} />
                </p>
              </div>
            </div>
          ) : (
            <div className="relative max-w-[85%] self-end rtl:self-start">
              <div
                className="overflow-hidden rounded-xl shadow-sm"
                style={{ backgroundColor: '#DCF8C6' }}
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
                {composed.message.buttons.map(({ button }) => (
                  <div
                    key={button.text}
                    className="flex items-center justify-center gap-1.5 border-t border-zinc-300/70 py-2 text-sm font-medium"
                    style={{ color: '#53B8C5' }}
                  >
                    {button.kind === 'url' ? <IconExternalLink size={14} /> : <IconArrowBack size={14} />}
                    <span>{button.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
  const detailsLink = (
    <Link
      href={`/app/${eventId}/details`}
      className="font-semibold underline underline-offset-2"
    >
      {t('detailsLink')}
    </Link>
  );

  let body: React.ReactNode;
  switch (refusal.reason) {
    case 'missing_details':
      body = (
        <>
          {t('missingDetails', {
            details: refusal.details.map((detail) => tDetails(detail)).join(', '),
          })}{' '}
          {detailsLink}
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
