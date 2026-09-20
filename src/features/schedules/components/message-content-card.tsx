'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  IconArrowBack,
  IconBrandWhatsapp,
  IconExternalLink,
  IconInfoCircle,
  IconMessage,
  IconPhoto,
} from '@tabler/icons-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { type EventApp } from '@/features/events/schemas';
import { CUSTOM_TEXT_MAX_LENGTH, type WhatsAppTemplateApp } from '../schemas';
import { updateCustomText } from '../actions';
import { resolveTemplateBodyForPreview } from '../utils/parameter-resolvers';

function resolveSourcePath(
  source: string,
  event: EventApp | null,
): string | null {
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

const chatBgStyle: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(229, 221, 213, 0.55), rgba(229, 221, 213, 0.55)), url('/whatsapp-background.png')`,
  backgroundSize: '300px',
  backgroundRepeat: 'repeat',
};

interface MessageContentCardProps {
  /** Needed to save the custom note; omit when there is nothing to save against. */
  scheduleId?: string;
  template: WhatsAppTemplateApp | null;
  smsBody?: string | null;
  /** Delivery channel for this schedule, shown as a badge in the card action slot. */
  channel?: 'whatsapp' | 'sms' | null;
  /**
   * Set only when this schedule has a table-number variant and some targeted
   * guests have no seating assignment. The preview shows the table version, so
   * without this the organiser would have no way to know a second version is
   * also going out.
   */
  seatingGap?: { withoutTable: number; total: number } | null;
  /** Whether this schedule's family offers a note variant at all. */
  offersNote?: boolean;
  /** The note currently saved on the schedule, if any. */
  customText?: string | null;
  /** A sent or cancelled schedule's note can no longer be edited. */
  scheduleLocked?: boolean;
  event: EventApp | null;
}

export function MessageContentCard({
  scheduleId,
  template,
  smsBody,
  channel,
  seatingGap,
  offersNote,
  customText,
  scheduleLocked,
  event,
}: MessageContentCardProps) {
  const t = useTranslations('schedules.messagePreview');
  const tChannel = useTranslations('schedules.channel');
  const [isSaving, startSaveTransition] = useTransition();
  const [savedNote, setSavedNote] = useState(customText ?? '');
  const [note, setNote] = useState(customText ?? '');
  const isDirty = !scheduleLocked && note !== savedNote;

  // `useState(customText ?? '')` only seeds state on the initial mount. This
  // card stays mounted across a server round-trip (e.g. the router refresh a
  // Server Action triggers, or navigating back to an already-rendered route),
  // so a later render can hand it a new `customText` prop without React ever
  // re-running that initializer. Left unsynced, the mount-time value (often
  // '' - the schedule had no note yet) keeps feeding the preview resolver
  // forever, which resolves the note placeholder to '' and falls back to the
  // "…" placeholder even though a real note is saved. Resync both whenever the
  // prop actually changes, so the preview never drifts from the server value.
  useEffect(() => {
    setSavedNote(customText ?? '');
    setNote(customText ?? '');
  }, [customText]);

  const handleSaveNote = () => {
    if (!scheduleId || !isDirty) return;

    startSaveTransition(async () => {
      const promise = updateCustomText(scheduleId, note).then((result) => {
        if (!result.success)
          throw new Error(result.message ?? t('customNote.toast.error'));
        return result;
      });

      toast.promise(promise, {
        loading: t('customNote.toast.updating'),
        success: () => t('customNote.toast.updated'),
        error: (err) => (err instanceof Error ? err.message : t('customNote.toast.error')),
      });

      try {
        await promise;
        setSavedNote(note);
      } catch {
        // error toast handled above
      }
    });
  };

  const { resolvedBody, hasMissingFields } = template
    ? resolveTemplateBodyForPreview(template, event, savedNote)
    : { resolvedBody: '', hasMissingFields: false };

  const headerPlaceholder = template?.parameters?.headerPlaceholders?.[0];
  const imageUrl = headerPlaceholder?.source
    ? resolveSourcePath(headerPlaceholder.source, event)
    : null;

  const buttons = template?.parameters?.buttonPlaceholders ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-md p-1.5">
            <IconMessage size={16} className="text-primary" />
          </div>
          {t('cardTitle')}
        </CardTitle>
        <CardDescription>
          {t('cardDescription')}
        </CardDescription>
        {channel && (
          <CardAction>
            <Badge variant="outline" className="gap-1 font-normal">
              {channel === 'whatsapp' ? (
                <IconBrandWhatsapp size={13} className="shrink-0" />
              ) : (
                <IconMessage size={13} className="shrink-0" />
              )}
              {tChannel(channel)}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {/* Phone mockup - the WhatsApp chat wallpaper only where the message
            actually arrives in WhatsApp; an SMS sits on a plain thread */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
          {/* Chat area */}
          <div
            className={cn(
              'flex flex-col gap-1 px-3 py-4',
              channel === 'sms' && 'bg-zinc-50',
            )}
            style={channel === 'sms' ? undefined : chatBgStyle}
          >
            {template === null && smsBody ? (
              <div className="flex justify-end rtl:justify-start py-2 px-1">
                <div className="relative max-w-[85%]">
                  <div className="absolute top-0 -right-[7px] rtl:right-auto rtl:-left-[7px] h-0 w-0 border-b-[8px] border-b-transparent border-l-[8px] border-l-zinc-200 rtl:border-l-0 rtl:border-r-[8px] rtl:border-r-zinc-200" />
                  <div className="rounded-l-xl rounded-br-xl rtl:rounded-l-none rtl:rounded-br-none rtl:rounded-r-xl rtl:rounded-bl-xl bg-zinc-200 px-3 py-2 shadow-sm">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-800" dir="rtl">
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
                  <div
                    className="absolute top-0 -right-[7px] rtl:right-auto rtl:-left-[7px] h-0 w-0 border-b-[8px] border-b-transparent border-l-[8px] border-l-[#DCF8C6] rtl:border-l-0 rtl:border-r-[8px] rtl:border-r-[#DCF8C6]"
                  />
                  <div
                    className="overflow-hidden rounded-l-xl rounded-br-xl rtl:rounded-l-none rtl:rounded-br-none rtl:rounded-r-xl rtl:rounded-bl-xl shadow-sm"
                    style={{ backgroundColor: '#DCF8C6' }}
                  >
                    {/* Image header */}
                    {template.headerType?.toUpperCase() === 'IMAGE' &&
                      (imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt="Header"
                          className="w-full rounded-t-xl object-cover p-1.5 pb-0"
                          style={{ maxHeight: 120 }}
                        />
                      ) : (
                        <div className="flex h-28 w-full flex-col items-center justify-center gap-1 bg-zinc-300/60">
                          <IconPhoto size={28} className="text-zinc-400" />
                          <span className="text-[10px] text-zinc-400">
                            {t('imagePlaceholder')}
                          </span>
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
                  <p className="max-w-[85%] self-end rtl:self-start pr-1 rtl:pr-0 rtl:pl-1 text-[11px] text-zinc-500 italic">
                    {template.footerText}
                  </p>
                )}
              </>
            )}
          </div>
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
        {hasMissingFields && event && (
          <Alert className="mt-3">
            <IconInfoCircle />
            <AlertTitle>{t('missingFields.title')}</AlertTitle>
            <AlertDescription>
              <p>{t('missingFields.description')}</p>
              <Button size="xs" variant="link" className="mt-1 px-0" asChild>
                <Link href={`/app/${event.id}/details`}>
                  {t('missingFields.link')}
                  <IconExternalLink />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {offersNote && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-muted-foreground tracking-wide">
                {t('customNote.label')}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {note.length}/{CUSTOM_TEXT_MAX_LENGTH}
                </span>
                {isDirty && (
                  <Button
                    onClick={handleSaveNote}
                    disabled={isSaving}
                    size="xs"
                    variant="outline"
                  >
                    {isSaving ? t('customNote.saving') : t('customNote.save')}
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              value={note}
              // Sliced rather than relying on maxLength alone, so a paste that
              // overshoots is trimmed instead of silently rejected whole.
              onChange={(e) =>
                setNote(e.target.value.slice(0, CUSTOM_TEXT_MAX_LENGTH))
              }
              maxLength={CUSTOM_TEXT_MAX_LENGTH}
              placeholder={t('customNote.placeholder')}
              disabled={isSaving || !scheduleId || scheduleLocked}
              dir="rtl"
              className="mt-1"
              rows={2}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
