'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  GuestWriteConfirmCard,
  type AddWriteToolResult,
} from './guest-write-confirm-card';
import type { AiChatMessage, WriteToolOutput } from '../types';

const PROMPT_KEYS = ['confirmed', 'addGuest', 'markDeclined', 'summary'] as const;

interface ChatMessagesProps {
  messages: AiChatMessage[];
  isLoading: boolean;
  showThinkingDots: boolean;
  eventId: string;
  addToolResult: AddWriteToolResult;
  onSuggestedPrompt: (text: string) => void;
}

export function ChatMessages({
  messages,
  isLoading,
  showThinkingDots,
  eventId,
  addToolResult,
  onSuggestedPrompt,
}: ChatMessagesProps) {
  const t = useTranslations('aiChat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="scrollbar-hide flex-1 space-y-3 overflow-y-auto p-4">
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
                onClick={() => onSuggestedPrompt(t(`suggestedPrompts.${key}`))}
                disabled={isLoading}
                className={cn(
                  'animate-slide-up rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground',
                  'transition-colors hover:border-muted-foreground/30 hover:bg-muted',
                  'disabled:cursor-not-allowed disabled:opacity-50',
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

      {messages.map((message) => (
        <div key={message.id} className="space-y-3">
          {message.parts.map((part, index) => {
            switch (part.type) {
              case 'text': {
                if (!part.text) return null;
                return (
                  <div
                    key={`${message.id}-${index}`}
                    className={cn(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm',
                      )}
                    >
                      {part.text}
                    </div>
                  </div>
                );
              }
              case 'tool-listGuests':
              case 'tool-getEventSummary': {
                if (part.state === 'output-available' || part.state === 'output-error') {
                  return null;
                }
                return (
                  <div
                    key={`${message.id}-${index}`}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <Loader2 className="size-3 animate-spin" />
                    {t('checking')}
                  </div>
                );
              }
              case 'tool-proposeAddGuest':
              case 'tool-proposeUpdateGuest':
              case 'tool-proposeDeleteGuest': {
                if (part.state === 'input-streaming' || part.input == null) {
                  return null;
                }
                const toolName = part.type.replace('tool-', '') as
                  | 'proposeAddGuest'
                  | 'proposeUpdateGuest'
                  | 'proposeDeleteGuest';
                return (
                  <div key={`${message.id}-${index}`} className="flex justify-start">
                    <GuestWriteConfirmCard
                      toolName={toolName}
                      toolCallId={part.toolCallId}
                      input={part.input}
                      state={part.state}
                      output={part.output as WriteToolOutput | undefined}
                      errorText={part.errorText}
                      eventId={eventId}
                      addToolResult={addToolResult}
                    />
                  </div>
                );
              }
              default:
                return null;
            }
          })}
        </div>
      ))}

      {showThinkingDots && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5">
            <span className="flex items-center gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
            </span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
