'use client';

import {
  IconAlertTriangle,
  IconArrowBack,
  IconExternalLink,
  IconInfoCircle,
  IconListDetails,
  IconPhoto,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type EventApp } from '@/features/events/schemas';

import { type WhatsAppTemplateApp } from '../schemas';
import { missingDetails } from '../utils/missing-details';
import { resolveTemplateBodyForPreview } from '../utils/parameter-resolvers';
import { useScheduleSettings } from './schedule-settings-context';

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
  template: WhatsAppTemplateApp | null;
  smsBody?: string | null;
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
 * is typed, so the preview and the field never disagree about what is unsaved.
 */
export function MessagePreview({
  template,
  smsBody,
  channel,
  seatingGap,
  event,
}: MessagePreviewProps) {
  const t = useTranslations('schedules.messagePreview');
  const { note } = useScheduleSettings();

  const { resolvedBody, missingSources } = template
    ? resolveTemplateBodyForPreview(template, event, note)
    : { resolvedBody: '', missingSources: [] };

  const headerPlaceholder = template?.parameters?.headerPlaceholders?.[0];
  const imageUrl = headerPlaceholder?.source
    ? resolveSourcePath(headerPlaceholder.source, event)
    : null;

  const buttons = template?.parameters?.buttonPlaceholders ?? [];

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-muted-foreground text-[13px] font-bold">{t('cardTitle')}</h3>
        <span className="text-muted-foreground/80 text-[11.5px]">{t('hint')}</span>
      </div>

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
                    {smsBody}
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
                    (imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt="Header"
                        className="h-auto w-full rounded-t-xl p-1.5 pb-0"
                      />
                    ) : (
                      <div className="flex h-28 w-full flex-col items-center justify-center gap-1 bg-zinc-300/60">
                        <IconPhoto size={28} className="text-zinc-400" />
                        <span className="text-[10px] text-zinc-400">{t('imagePlaceholder')}</span>
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
                      {resolvedBody}
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
    </section>
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
