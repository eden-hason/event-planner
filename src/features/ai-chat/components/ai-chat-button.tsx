'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useMemo, useRef } from 'react';
import { Bot } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { AiChat } from './ai-chat';

function getEventIdFromPathname(pathname: string): string | null {
  // Requires a trailing slash after the segment to avoid matching top-level slugs (e.g. /app/new-event)
  const match = pathname.match(/^\/app\/([^/]+)\//);
  return match ? match[1] : null;
}

export function AiChatButton() {
  const t = useTranslations('aiChat');
  const pathname = usePathname();
  const eventId = getEventIdFromPathname(pathname);

  const eventIdRef = useRef(eventId);
  eventIdRef.current = eventId;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai-chat',
        body: () => ({ eventId: eventIdRef.current }),
      }),
    [],
  );

  const chatHelpers = useChat({ transport });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="fixed bottom-6 left-6 z-40 rounded-full p-[2px] bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 shadow-[0_0_24px_4px_rgba(139,92,246,0.45)] hover:shadow-[0_0_32px_8px_rgba(139,92,246,0.6)] transition-shadow duration-300 cursor-pointer"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-zinc-950 hover:bg-zinc-900 transition-colors duration-200">
            <Bot className="size-6 text-white" />
            <span className="sr-only">{t('openAssistant')}</span>
          </span>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="m-3 flex h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-clip rounded-xl border-0 p-0 sm:max-w-[420px] [&>button]:hidden">
        <SheetTitle className="sr-only">{t('title')}</SheetTitle>
        <div className="flex-1 min-h-0">
          <AiChat chatHelpers={chatHelpers} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
