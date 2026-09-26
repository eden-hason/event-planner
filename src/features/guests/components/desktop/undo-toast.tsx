'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';
import {
  UNDO_WINDOW_MS,
  type PendingDelete,
} from '@/features/guests/hooks/use-deferred-delete';

const RING = 2 * Math.PI * 10;

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
}: {
  pending: PendingDelete | null;
  failedCount: number;
  onUndo: () => void;
  onRetry: () => void;
  onDismissFailure: () => void;
}) {
  const t = useTranslations('guests.list.undo');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!pending) return;
    const tick = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(tick);
  }, [pending]);

  if (!pending && failedCount === 0) return null;

  const left = pending ? Math.max(0, pending.expiresAt - now) : 0;
  const secs = Math.ceil(left / 1000);

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-foreground text-background animate-in fade-in slide-in-from-bottom-3 pointer-events-auto flex min-h-[52px] w-[440px] items-center gap-3 rounded-xl py-2.5 ps-3.5 pe-3 shadow-[0_16px_40px_rgba(26,11,46,0.3)] duration-200"
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
          <span
            className="relative flex size-[26px] shrink-0 items-center justify-center"
            aria-hidden
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 26 26"
              className="absolute inset-0 -rotate-90"
            >
              <circle
                cx="13"
                cy="13"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.25}
                strokeWidth="2.5"
              />
              <circle
                cx="13"
                cy="13"
                r="10"
                fill="none"
                className="stroke-primary"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={RING}
                strokeDashoffset={RING * (1 - left / UNDO_WINDOW_MS)}
              />
            </svg>
            <span className="text-background/70 relative text-[11px] font-bold tabular-nums">
              {secs}
            </span>
          </span>
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
