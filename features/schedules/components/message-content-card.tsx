'use client';

import { useTranslations } from 'next-intl';
import {
  IconArrowBack,
  IconExternalLink,
  IconInfoCircle,
  IconMessage,
  IconPhoto,
} from '@tabler/icons-react';

import Link from 'next/link';

import { cardHover } from '@/lib/utils';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { type EventApp } from '@/features/events/schemas';
import type { WhatsAppTemplateApp } from '../schemas';
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
  template: WhatsAppTemplateApp | null;
  event: EventApp | null;
}

export function MessageContentCard({
  template,
  event,
}: MessageContentCardProps) {
  const t = useTranslations('schedules.messagePreview');
  const { resolvedBody, hasMissingFields } = template
    ? resolveTemplateBodyForPreview(template, event)
    : { resolvedBody: '', hasMissingFields: false };

  const headerPlaceholder = template?.parameters?.headerPlaceholders?.[0];
  const imageUrl = headerPlaceholder?.source
    ? resolveSourcePath(headerPlaceholder.source, event)
    : null;

  const buttons = template?.parameters?.buttonPlaceholders ?? [];

  return (
    <Card className={cardHover}>
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
      </CardHeader>
      <CardContent>
        {/* WhatsApp phone mockup */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
          {/* Chat area */}
          <div
            className="flex min-h-[180px] flex-col gap-1 px-3 py-4"
            style={chatBgStyle}
          >
            {template === null ? (
              <div className="flex min-h-[140px] flex-1 items-center justify-center">
                <p className="rounded-lg bg-white/80 px-3 py-1.5 text-xs text-zinc-500">
                  {t('noMessage')}
                </p>
              </div>
            ) : (
              <>
                {/* Message bubble */}
                <div className="relative max-w-[85%] self-end">
                  {/* Bubble tail */}
                  <div
                    className="absolute top-0 -right-[7px] h-0 w-0"
                    style={{
                      borderLeft: '8px solid #DCF8C6',
                      borderBottom: '8px solid transparent',
                    }}
                  />
                  <div
                    className="overflow-hidden rounded-l-xl rounded-br-xl shadow-sm"
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
                  <p className="max-w-[85%] self-end pr-1 text-[11px] text-zinc-500 italic">
                    {template.footerText}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
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
      </CardContent>
    </Card>
  );
}
