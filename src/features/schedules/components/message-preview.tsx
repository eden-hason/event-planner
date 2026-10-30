'use client';

import {
  IconAlertTriangle,
  IconArrowBack,
  IconExternalLink,
  IconInfoCircle,
  IconListDetails,
  IconPhoto,
  IconPlayerPlayFilled,
  IconVideo,
} from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type EventApp } from '@/features/events/schemas';

import { toWhatsAppTemplate } from '../schemas';
import type { PreviewMessages } from '../types';
import { hasNote, hasPersonalMessage } from '../utils/event-config';
import { splitMessageLinks } from '../utils/message-links';
import { missingDetails } from '../utils/missing-details';
import {
  resolveSmsBodyForPreview,
  resolveTemplateBodyForPreview,
} from '../utils/parameter-resolvers';
import { useScheduleSettings } from './schedule-settings-context';
import { SettingsCard } from './settings-card';

function resolveSourcePath(source: string, event: EventApp | null): string | null {
  if (!event) return null;
  const context: Record<string, unknown> = { event };
  const parts = source.split('.');
  let current: unknown = context;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : null;
}

/**
 * The name on Kululu's WhatsApp Business profile. Every guest sees this sender
 * whichever Event the message is about, so the preview shows it as-is rather
 * than deriving a name from the Event.
 */
const SENDER_NAME = 'Kululu אישורי הגעה';

const chatBgStyle: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(229, 221, 213, 0.55), rgba(229, 221, 213, 0.55)), url('/whatsapp-background.png')`,
  backgroundSize: '300px',
  backgroundRepeat: 'repeat',
};

interface MessagePreviewProps {
  messages: PreviewMessages;
  /** Delivery channel: WhatsApp gets the chat wallpaper and header bar, SMS a plain thread. */
  channel?: 'whatsapp' | 'sms' | null;
  /**
   * Set only when this schedule has a table-number variant and some targeted
   * guests have no seating assignment. The preview shows the table version, so
   * without this the organiser would have no way to know a second version is
   * also going out.
   */
  seatingGap?: { withoutTable: number; total: number } | null;
  event: EventApp | null;
}

/**
 * The message as the guest will see it.
 *
 * Not in a card: it is the thing the organiser came to check, and a border
 * around it would make it one setting among the others. Reads the note as it
 * is typed, so the preview and the field never disagree about what is unsaved:
 * both the text and which version of the message carries it follow the field.
 */
export function MessagePreview({
  messages,
  channel,
  seatingGap,
  event,
}: MessagePreviewProps) {
  const t = useTranslations('schedules.messagePreview');
  const { note, effectivePersonalMessage } = useScheduleSettings();

  // The send's own rules, so the preview switches versions exactly where the
  // send would - while the fields are still being typed. Trimmed as the save
  // stores them. A Personal Message wins over Kululu's message, note or not; a
  // blank one is none, and Kululu's goes (ADR 0046).
  const savedNote = note.trim();
  const savedPersonalMessage = effectivePersonalMessage.trim();
  const message = messages
    ? hasPersonalMessage(savedPersonalMessage) && messages.personalMessage
      ? messages.personalMessage
      : hasNote(savedNote)
        ? messages.withNote
        : messages.withoutNote
    : null;
  const scheduleText = { customText: savedNote, personalMessage: savedPersonalMessage };
  const template = message ? toWhatsAppTemplate(message) : null;
  const smsBody =
    message?.channel === 'sms'
      ? resolveSmsBodyForPreview(message.payload, event, scheduleText).resolvedBody
      : null;

  const { resolvedBody, missingSources } = template
    ? resolveTemplateBodyForPreview(template, event, scheduleText)
    : { resolvedBody: '', missingSources: [] };

  const headerPlaceholder = template?.parameters?.headerPlaceholders?.[0];
  const headerMediaUrl = headerPlaceholder?.source
    ? resolveSourcePath(headerPlaceholder.source, event)
    : null;

  const buttons = template?.parameters?.buttonPlaceholders ?? [];

  return (
    <SettingsCard
      title={t('cardTitle')}
      aside={<span className="text-muted-foreground/80 text-[11.5px]">{t('hint')}</span>}
    >

      {/* Phone mockup - the WhatsApp header bar and chat wallpaper only where the
          message actually arrives in WhatsApp; an SMS sits on a plain thread */}
      <div className="overflow-hidden rounded-2xl border">
        {channel !== 'sms' && (
          <div className="flex items-center gap-2.5 bg-[#075E54] px-3 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kululu-logo-mark.svg"
              alt=""
              aria-hidden
              className="size-[30px] shrink-0 rounded-full"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13.5px] font-semibold text-white">{SENDER_NAME}</span>
              <span className="text-[11px] text-white/70">{t('business')}</span>
            </div>
          </div>
        )}
        {/* Chat area */}
        <div
          className={cn('flex flex-col gap-1 px-3 py-4', channel === 'sms' && 'bg-zinc-50')}
          style={channel === 'sms' ? undefined : chatBgStyle}
        >
          {template === null && smsBody ? (
            <div className="flex justify-end px-1 py-2 rtl:justify-start">
              <div className="relative max-w-[85%]">
                <div className="absolute top-0 -right-[7px] h-0 w-0 border-b-[8px] border-l-[8px] border-b-transparent border-l-zinc-200 rtl:right-auto rtl:-left-[7px] rtl:border-r-[8px] rtl:border-l-0 rtl:border-r-zinc-200" />
                <div className="rounded-l-xl rounded-br-xl bg-zinc-200 px-3 py-2 shadow-sm rtl:rounded-l-none rtl:rounded-r-xl rtl:rounded-br-none rtl:rounded-bl-xl">
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-800"
                    dir="rtl"
                  >
                    <MessageBody body={smsBody} />
                  </p>
                </div>
              </div>
            </div>
          ) : template === null ? (
            <div className="flex items-center justify-center py-6">
              <p className="rounded-lg bg-white/80 px-3 py-1.5 text-xs text-zinc-500">
                {t('noMessage')}
              </p>
            </div>
          ) : (
            <>
              {/* Message bubble */}
              <div className="relative max-w-[85%] self-end rtl:self-start">
                {/* Bubble tail */}
                <div className="absolute top-0 -right-[7px] h-0 w-0 border-b-[8px] border-l-[8px] border-b-transparent border-l-[#DCF8C6] rtl:right-auto rtl:-left-[7px] rtl:border-r-[8px] rtl:border-l-0 rtl:border-r-[#DCF8C6]" />
                <div
                  className="overflow-hidden rounded-l-xl rounded-br-xl shadow-sm rtl:rounded-l-none rtl:rounded-r-xl rtl:rounded-br-none rtl:rounded-bl-xl"
                  style={{ backgroundColor: '#DCF8C6' }}
                >
                  {/* Image header */}
                  {template.headerType?.toUpperCase() === 'IMAGE' &&
                    (headerMediaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={headerMediaUrl}
                        alt="Header"
                        className="h-auto w-full rounded-t-xl p-1.5 pb-0"
                      />
                    ) : (
                      <div className="flex h-28 w-full flex-col items-center justify-center gap-1 bg-zinc-300/60">
                        <IconPhoto size={28} className="text-zinc-400" />
                        <span className="text-[10px] text-zinc-400">{t('imagePlaceholder')}</span>
                      </div>
                    ))}
                  {/* Video header - a Bespoke Template's uploaded video. Full
                      bubble width at the video's own aspect ratio, as WhatsApp
                      shows it: no height cap, so a portrait video is never
                      letterboxed. */}
                  {template.headerType?.toUpperCase() === 'VIDEO' &&
                    (headerMediaUrl ? (
                      <PreviewVideo src={headerMediaUrl} playLabel={t('playVideo')} />
                    ) : (
                      <div className="flex h-28 w-full flex-col items-center justify-center gap-1 bg-zinc-300/60">
                        <IconVideo size={28} className="text-zinc-400" />
                        <span className="text-[10px] text-zinc-400">{t('videoPlaceholder')}</span>
                      </div>
                    ))}
                  {/* Text content */}
                  <div className="px-3 py-2">
                    {template.headerText && (
                      <p className="mb-1 text-sm leading-tight font-semibold text-zinc-800">
                        {template.headerText}
                      </p>
                    )}
                    <p
                      className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-800"
                      dir="rtl"
                    >
                      <MessageBody body={resolvedBody} />
                    </p>
                  </div>
                  {/* Buttons */}
                  {buttons.length > 0 && (
                    <div>
                      {buttons.map((btn, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-center gap-1.5 border-t border-zinc-300/70 py-2 text-sm font-medium"
                          style={{ color: '#53B8C5' }}
                        >
                          {btn.subType === 'url' ? (
                            <IconExternalLink size={14} />
                          ) : (
                            <IconArrowBack size={14} />
                          )}
                          <span>{btn.text ?? t('button', { index: btn.index + 1 })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer text */}
              {template.footerText && (
                <p className="max-w-[85%] self-end pr-1 text-[11px] text-zinc-500 italic rtl:self-start rtl:pr-0 rtl:pl-1">
                  {template.footerText}
                </p>
              )}
            </>
          )}
        </div>
        {missingSources.length > 0 && event && (
          <MissingDetailsNotice sources={missingSources} eventId={event.id} />
        )}
      </div>
      {seatingGap && event && (
        <Alert className="mt-3">
          <IconInfoCircle />
          <AlertTitle>{t('seatingGap.title')}</AlertTitle>
          <AlertDescription>
            <p>
              {t('seatingGap.description', {
                withoutTable: seatingGap.withoutTable,
                total: seatingGap.total,
              })}
            </p>
            <Button size="xs" variant="link" className="mt-1 px-0" asChild>
              <Link href={`/app/${event.id}/seating`}>
                {t('seatingGap.link')}
                <IconExternalLink />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </SettingsCard>
  );
}

/**
 * The video header as WhatsApp shows it: the first frame with one round play
 * button in the middle and no player controls. Playing hides the button;
 * tapping the video pauses it and the button comes back, as it does at the end.
 */
function PreviewVideo({ src, playLabel }: { src: string; playLabel: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative p-1.5 pb-0">
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onClick={() => videoRef.current?.pause()}
        className="block h-auto w-full rounded-t-xl"
      />
      {!playing && (
        <button
          type="button"
          aria-label={playLabel}
          onClick={() => void videoRef.current?.play()}
          className="absolute inset-0 flex cursor-pointer items-center justify-center"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-zinc-100/90 text-zinc-700 shadow-sm">
            <IconPlayerPlayFilled size={22} className="translate-x-px" />
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * The body text with its URLs as links, the way the guest's phone shows them -
 * WhatsApp and SMS apps both link a URL found anywhere in the text, the
 * organiser's note included. Opens in a new tab so the organiser can check
 * where a link goes without leaving the page.
 */
function MessageBody({ body }: { body: string }) {
  return splitMessageLinks(body).map((segment, i) =>
    segment.kind === 'link' ? (
      <a
        key={i}
        href={segment.href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-[#027EB5] underline underline-offset-2"
      >
        {segment.text}
      </a>
    ) : (
      segment.text
    ),
  );
}

/**
 * Event details the message shows that the event does not have yet. Attached
 * to the foot of the preview rather than floating beside it: it is about the
 * gaps in the message right above it, which is where the Owner is looking.
 */
function MissingDetailsNotice({
  sources,
  eventId,
}: {
  sources: string[];
  eventId: string;
}) {
  const t = useTranslations('schedules.messagePreview.missingFields');
  const details = missingDetails(sources);
  // A source with no detail to name still counts, so the title never says zero
  const count = details.length || sources.length;

  return (
    <div className="border-warning-tint-border bg-warning-tint text-warning-strong flex flex-col gap-2.5 border-t px-3 py-3">
      <div className="flex items-start gap-2.5">
        <span className="bg-warning-tint-border flex size-[26px] shrink-0 items-center justify-center rounded-[9px]">
          <IconAlertTriangle size={15} stroke={2.1} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13.5px] font-bold">{t('title')}</span>
          <span className="text-xs leading-normal">
            {t('description', { count })}
          </span>
        </div>
      </div>
      {details.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {details.map((detail) => (
            <li
              key={detail}
              className="border-warning-tint-border bg-card rounded-full border px-2.5 py-1 text-[11.5px] font-semibold"
            >
              {t(`fields.${detail}`)}
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/app/${eventId}/details`}
        className="bg-warning-strong text-warning-tint flex h-9 items-center justify-center gap-1.5 rounded-[11px] text-[13.5px] font-bold transition-opacity hover:opacity-90"
      >
        <IconListDetails size={15} stroke={2.1} />
        {t('link')}
      </Link>
    </div>
  );
}
