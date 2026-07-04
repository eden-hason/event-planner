'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2, Trash2, UserRoundPen, UserRoundPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { upsertGuest, deleteGuest } from '@/features/guests';
import type {
  AiWriteToolName,
  ProposeAddGuestInput,
  ProposeDeleteGuestInput,
  ProposeUpdateGuestInput,
  WriteToolOutput,
} from '../types';

type WriteToolInput =
  | ProposeAddGuestInput
  | ProposeUpdateGuestInput
  | ProposeDeleteGuestInput;

export type AddWriteToolResult = (args: {
  tool: AiWriteToolName;
  toolCallId: string;
  output: WriteToolOutput;
}) => void | PromiseLike<void>;

interface GuestWriteConfirmCardProps {
  toolName: AiWriteToolName;
  toolCallId: string;
  input: WriteToolInput;
  state:
    | 'input-streaming'
    | 'input-available'
    | 'approval-requested'
    | 'approval-responded'
    | 'output-available'
    | 'output-error'
    | 'output-denied';
  output?: WriteToolOutput;
  errorText?: string;
  eventId: string;
  addToolResult: AddWriteToolResult;
}

const TOOL_ICON: Record<AiWriteToolName, typeof UserRoundPlus> = {
  proposeAddGuest: UserRoundPlus,
  proposeUpdateGuest: UserRoundPen,
  proposeDeleteGuest: Trash2,
};

const TITLE_KEY: Record<AiWriteToolName, string> = {
  proposeAddGuest: 'addTitle',
  proposeUpdateGuest: 'updateTitle',
  proposeDeleteGuest: 'deleteTitle',
};

const RESOLVED_KEY: Record<AiWriteToolName, string> = {
  proposeAddGuest: 'added',
  proposeUpdateGuest: 'updated',
  proposeDeleteGuest: 'deleted',
};

export function GuestWriteConfirmCard({
  toolName,
  toolCallId,
  input,
  state,
  output,
  errorText,
  eventId,
  addToolResult,
}: GuestWriteConfirmCardProps) {
  const t = useTranslations('aiChat.confirm');
  const [isPending, setIsPending] = useState(false);

  const Icon = TOOL_ICON[toolName];

  async function handleApprove() {
    if (isPending) return;
    setIsPending(true);
    try {
      let result: WriteToolOutput;
      if (toolName === 'proposeDeleteGuest') {
        const res = await deleteGuest((input as ProposeDeleteGuestInput).id);
        result = res.success
          ? { ok: true }
          : { ok: false, error: res.message };
      } else {
        const data = input as ProposeAddGuestInput | ProposeUpdateGuestInput;
        const formData = new FormData();
        if ('id' in data && data.id) formData.append('id', data.id);
        if (data.name != null) formData.append('name', data.name);
        if (data.phone != null) formData.append('phone', data.phone);
        if (data.side != null) formData.append('side', data.side);
        if (data.amount != null) formData.append('amount', String(data.amount));
        if (data.rsvpStatus != null) formData.append('rsvpStatus', data.rsvpStatus);
        if (data.notes != null) formData.append('notes', data.notes);
        const res = await upsertGuest(eventId, formData);
        result = res.success
          ? { ok: true }
          : { ok: false, error: res.message ?? 'Operation failed' };
      }
      await addToolResult({ tool: toolName, toolCallId, output: result });
    } finally {
      setIsPending(false);
    }
  }

  async function handleDecline() {
    if (isPending) return;
    await addToolResult({
      tool: toolName,
      toolCallId,
      output: { ok: false, declined: true, error: 'User declined the proposal' },
    });
  }

  const details: Array<{ label: string; value: string }> = [];
  if (input.name) details.push({ label: t('fields.name'), value: input.name });
  if ('phone' in input && input.phone) {
    details.push({ label: t('fields.phone'), value: input.phone });
  }
  if ('side' in input && input.side) {
    details.push({ label: t('fields.side'), value: t(`sideValues.${input.side}`) });
  }
  if ('amount' in input && input.amount != null) {
    details.push({ label: t('fields.amount'), value: String(input.amount) });
  }
  if ('rsvpStatus' in input && input.rsvpStatus) {
    details.push({
      label: t('fields.status'),
      value: t(`statusValues.${input.rsvpStatus}`),
    });
  }
  if ('notes' in input && input.notes) {
    details.push({ label: t('fields.notes'), value: input.notes });
  }

  const isResolved =
    state === 'output-available' ||
    state === 'output-error' ||
    state === 'output-denied';

  function renderResolvedBadge() {
    if (state === 'output-denied') {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <X className="size-3.5" />
          {t('declinedState')}
        </span>
      );
    }
    if (state === 'output-error') {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-destructive">
          <X className="size-3.5" />
          {errorText || t('failed')}
        </span>
      );
    }
    if (output?.ok) {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="size-3.5" />
          {t(RESOLVED_KEY[toolName])}
        </span>
      );
    }
    if (output?.declined) {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <X className="size-3.5" />
          {t('declinedState')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-sm text-destructive">
        <X className="size-3.5" />
        {output?.error || t('failed')}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'w-full max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-background p-3 text-sm',
        toolName === 'proposeDeleteGuest' && !isResolved && 'border-destructive/40',
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        <Icon
          className={cn(
            'size-4',
            toolName === 'proposeDeleteGuest'
              ? 'text-destructive'
              : 'text-primary',
          )}
        />
        {t(TITLE_KEY[toolName])}
      </div>

      {details.length > 0 && (
        <dl className="mt-2 space-y-0.5">
          {details.map(({ label, value }) => (
            <div key={label} className="flex gap-2">
              <dt className="text-muted-foreground">{label}:</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-3">
        {isResolved ? (
          renderResolvedBadge()
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isPending || state !== 'input-available'}
              variant={toolName === 'proposeDeleteGuest' ? 'destructive' : 'default'}
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              {t('approve')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDecline}
              disabled={isPending || state !== 'input-available'}
            >
              {t('decline')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
