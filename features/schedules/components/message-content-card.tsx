'use client';

import { ImageIcon, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { type EventApp } from '@/features/events/schemas';
import { sendWhatsAppTestMessage } from '../actions';
import type { DeliveryMethod, WhatsAppTemplateApp } from '../schemas';

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

const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
};

const chatBgStyle: React.CSSProperties = {
  backgroundColor: '#E5DDD5',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='1' fill='%23C9BBAD' fill-opacity='0.4'/%3E%3C/svg%3E")`,
};

interface MessageContentCardProps {
  template: WhatsAppTemplateApp | null;
  deliveryMethod?: DeliveryMethod;
  event: EventApp | null;
}

export function MessageContentCard({ template, deliveryMethod, event }: MessageContentCardProps) {
  const headerPlaceholder = template?.parameters?.headerPlaceholders?.[0];
  const imageUrl = headerPlaceholder?.source
    ? resolveSourcePath(headerPlaceholder.source, event)
    : null;

  const handleSendTest = () => {
    const promise = sendWhatsAppTestMessage().then((result) => {
      if (!result.success) throw new Error(result.message);
      return result;
    });

    toast.promise(promise, {
      loading: 'Sending test message...',
      success: (data) => data.message,
      error: (err) =>
        err instanceof Error ? err.message : 'Failed to send.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Message Preview</CardTitle>
        <CardAction>
          <Badge variant="outline">{deliveryMethod ? DELIVERY_METHOD_LABELS[deliveryMethod] : 'N/A'}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {/* WhatsApp phone mockup */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
          {/* Chat area */}
          <div className="flex min-h-[180px] flex-col gap-1 px-3 py-4" style={chatBgStyle}>
            {template === null ? (
              <div className="flex min-h-[140px] flex-1 items-center justify-center">
                <p className="rounded-lg bg-white/80 px-3 py-1.5 text-xs text-zinc-500">
                  No message configured yet.
                </p>
              </div>
            ) : (
              <>
                {/* Message bubble */}
                <div className="relative self-end max-w-[85%]">
                  {/* Bubble tail */}
                  <div
                    className="absolute -right-[7px] top-0 h-0 w-0"
                    style={{
                      borderLeft: '8px solid #DCF8C6',
                      borderBottom: '8px solid transparent',
                    }}
                  />
                  <div className="overflow-hidden rounded-l-xl rounded-br-xl shadow-sm" style={{ backgroundColor: '#DCF8C6' }}>
                    {/* Image header */}
                    {template.headerType?.toUpperCase() === 'IMAGE' && (
                      imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt="Header" className="w-full object-contain" style={{ maxHeight: 120 }} />
                      ) : (
                        <div className="flex h-28 w-full flex-col items-center justify-center gap-1 bg-zinc-300/60">
                          <ImageIcon className="h-7 w-7 text-zinc-400" />
                          <span className="text-[10px] text-zinc-400">Image</span>
                        </div>
                      )
                    )}
                    {/* Text content */}
                    <div className="px-3 py-2">
                      {template.headerText && (
                        <p className="mb-1 text-sm font-semibold leading-tight text-zinc-800">
                          {template.headerText}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap" dir="rtl">
                        {template.bodyText}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer text */}
                {template.footerText && (
                  <p className="self-end max-w-[85%] pr-1 text-[11px] italic text-zinc-500">
                    {template.footerText}
                  </p>
                )}
              </>
            )}
          </div>

        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={handleSendTest}>
          <Send className="h-4 w-4" />
          Send Test to Me
        </Button>
      </CardFooter>
    </Card>
  );
}
