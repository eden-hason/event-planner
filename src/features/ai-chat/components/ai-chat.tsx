'use client';

import type { useChat } from '@ai-sdk/react';
import { isTextUIPart } from 'ai';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SendHorizonal } from 'lucide-react';

type ChatHelpers = ReturnType<typeof useChat>;

interface AiChatProps {
  chatHelpers: ChatHelpers;
}

const PROMPT_KEYS = ['timeline', 'seating', 'vendors', 'gifts'] as const;

export function AiChat({ chatHelpers }: AiChatProps) {
  const t = useTranslations('aiChat');
  const { messages, sendMessage, status } = chatHelpers;
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isLoading = status === 'submitted' || status === 'streaming';

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

  const showThinkingDots =
    status === 'submitted' ||
    (status === 'streaming' &&
      messages.length > 0 &&
      messages[messages.length - 1].role === 'user');

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-4 pb-6">
            <div
              className="animate-slide-up"
              style={{ animationFillMode: 'both', animationDelay: '0ms' }}
            >
              <Image
                src="/hero-chat.svg"
                alt=""
                width={180}
                height={180}
                priority
                className="select-none"
              />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {PROMPT_KEYS.map((key, i) => (
                <button
                  key={key}
                  onClick={() => handleSuggestedPrompt(t(`suggestedPrompts.${key}`))}
                  disabled={isLoading}
                  className={cn(
                    'animate-slide-up rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground',
                    'transition-colors hover:bg-muted hover:border-muted-foreground/30',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'cursor-pointer',
                  )}
                  style={{
                    animationFillMode: 'both',
                    animationDelay: `${650 + i * 100}ms`,
                  }}
                >
                  {t(`suggestedPrompts.${key}`)}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) => {
          const text = message.parts.filter(isTextUIPart).map((p) => p.text).join('');
          if (!text && message.role === 'assistant') return null;
          return (
            <div
              key={message.id}
              className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm',
                )}
              >
                {text}
              </div>
            </div>
          );
        })}
        {showThinkingDots && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5">
              <span className="flex gap-1 items-center">
                <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            rows={1}
            className="min-h-9 max-h-32 resize-none"
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
  );
}
