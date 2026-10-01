'use client';

import { useTranslations } from 'next-intl';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';
import type { PendingDelete } from '@/features/guests/hooks/use-deferred-delete';
import { cn } from '@/lib/utils';
import { CountdownRing } from './countdown-ring';

/**
 * The Undo toast of a deferred delete (ADR 0025), with a visible countdown. It
 * is the page's own rather than a Sonner toast: it sits bottom-center over the
 * list, above the selection bar, and its lifetime is the delete's.
 */
export function UndoToast({
  pending,
  failedCount,
  onUndo,
  onRetry,
  onDismissFailure,
  className,
}: {
  /** Where it sits: desktop centres it over the list, the phone pins it above the nav. */
  className?: string;
  pending: PendingDelete | null;
  failedCount: number;
  onUndo: () => void;
  onRetry: () => void;
  onDismissFailure: () => void;
}) {
  const t = useTranslations('guests.list.undo');
  if (!pending && failedCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'bg-foreground text-background animate-in fade-in slide-in-from-bottom-3 pointer-events-auto flex min-h-[52px] items-center gap-3 rounded-xl py-2.5 ps-3.5 pe-3 shadow-[0_16px_40px_rgba(26,11,46,0.3)] duration-200 md:w-[440px]',
        className,
      )}
    >
      {pending ? (
        <>
          <span className="flex-1 text-[13.5px] leading-snug font-semibold">
            {t('deleted', { count: pending.ids.length })}
          </span>
          <button
            type="button"
            onClick={onUndo}
            className="border-background/25 hover:bg-background/10 flex h-8 items-center rounded-lg border px-3 text-[13px] font-bold"
          >
            {t('action')}
          </button>
          <CountdownRing expiresAt={pending.expiresAt} />
        </>
      ) : (
        <>
          <span className="bg-destructive flex size-[26px] shrink-0 items-center justify-center rounded-lg text-white">
            <IconAlertTriangle size={15} stroke={2.2} />
          </span>
          <span className="flex-1 text-[13.5px] leading-snug font-semibold">
            {t('failed', { count: failedCount })}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="border-background/25 hover:bg-background/10 flex h-8 items-center rounded-lg border px-3 text-[13px] font-bold"
          >
            {t('retry')}
          </button>
          <button
            type="button"
            onClick={onDismissFailure}
            aria-label={t('dismiss')}
            className="text-background/70 hover:text-background flex size-7 items-center justify-center rounded-md"
          >
            <IconX size={15} />
          </button>
        </>
      )}
    </div>
  );
}
