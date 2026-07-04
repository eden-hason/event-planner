'use client';

import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { useTranslations } from 'next-intl';
import { Bot, SendHorizonal } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessages } from './chat-messages';
import type { AiChatMessage } from '../types';

interface AiAssistantProps {
  eventId: string;
}

export function AiAssistant({ eventId }: AiAssistantProps) {
  const t = useTranslations('aiChat');
  const [input, setInput] = useState('');

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai-chat',
        body: { eventId },
      }),
    [eventId],
  );

  const { messages, sendMessage, status, addToolResult } =
    useChat<AiChatMessage>({
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    });

  const isLoading = status === 'submitted' || status === 'streaming';

  const showThinkingDots =
    status === 'submitted' ||
    (status === 'streaming' &&
      messages.length > 0 &&
      messages[messages.length - 1].role === 'user');

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleSuggestedPrompt(text: string) {
    if (isLoading) return;
    sendMessage({ text });
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="fixed bottom-6 left-6 z-40 cursor-pointer rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 p-[2px] shadow-[0_0_24px_4px_rgba(139,92,246,0.45)] transition-shadow duration-300 hover:shadow-[0_0_32px_8px_rgba(139,92,246,0.6)]">
          <span className="flex size-12 items-center justify-center rounded-full bg-zinc-950 transition-colors duration-200 hover:bg-zinc-900">
            <Bot className="size-6 text-white" />
            <span className="sr-only">{t('openAssistant')}</span>
          </span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="m-3 flex h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-clip rounded-xl border-0 p-0 sm:max-w-[420px] [&>button]:hidden"
      >
        <SheetTitle className="sr-only">{t('title')}</SheetTitle>

        <div className="flex min-h-0 flex-1 flex-col">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            showThinkingDots={showThinkingDots}
            eventId={eventId}
            addToolResult={addToolResult}
            onSuggestedPrompt={handleSuggestedPrompt}
          />

          <div className="p-3">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('placeholder')}
                rows={1}
                className="max-h-32 min-h-9 resize-none"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="shrink-0"
              >
                <SendHorizonal className="size-4 rtl:rotate-180" />
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
