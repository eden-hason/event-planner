'use client';

import { IconAlertTriangle, IconMessage, IconPhoto } from '@tabler/icons-react';

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
  backgroundColor: '#E5DDD5',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='1' fill='%23C9BBAD' fill-opacity='0.4'/%3E%3C/svg%3E")`,
};

interface MessageContentCardProps {
  template: WhatsAppTemplateApp | null;
  event: EventApp | null;
}

export function MessageContentCard({
  template,
  event,
}: MessageContentCardProps) {
  const { resolvedBody, hasMissingFields } = template
    ? resolveTemplateBodyForPreview(template, event)
    : { resolvedBody: '', hasMissingFields: false };

  const headerPlaceholder = template?.parameters?.headerPlaceholders?.[0];
  const imageUrl = headerPlaceholder?.source
    ? resolveSourcePath(headerPlaceholder.source, event)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <IconMessage size={16} className="text-primary" />
          </div>
          Message Preview
        </CardTitle>
        <CardDescription>
          The message guests will receive for this schedule.
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
                  No message configured yet.
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
                          className="w-full object-contain"
                          style={{ maxHeight: 120 }}
                        />
                      ) : (
                        <div className="flex h-28 w-full flex-col items-center justify-center gap-1 bg-zinc-300/60">
                          <IconPhoto size={28} className="text-zinc-400" />
                          <span className="text-[10px] text-zinc-400">
                            Image
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
        {hasMissingFields && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <IconAlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
            <span>
              Some event data is missing. Update your event details to see the
              full preview.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
