'use client';

import { useTranslations } from 'next-intl';
import type { PendingGroupDelete } from '@/features/guests/hooks/use-deferred-group-delete';
import { CountdownRing } from '../../countdown-ring';

/**
 * The Undo toast after a group delete: two lines, an Undo button and a
 * countdown ring, floating above the app's bottom nav.
 */
export function GroupUndoToast({
  pending,
  onUndo,
}: {
  pending: PendingGroupDelete | null;
  onUndo: () => void;
}) {
  const t = useTranslations('guests.groups.mobile');
  if (!pending) return null;


  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-foreground text-background animate-in fade-in slide-in-from-bottom-3 fixed inset-x-3 bottom-[calc(var(--app-bottom-nav-height)+env(safe-area-inset-bottom)+12px)] z-40 flex min-h-[52px] items-center gap-2.5 rounded-[14px] py-2.5 ps-3.5 pe-3 shadow-[0_14px_34px_rgba(26,11,46,0.3)] duration-200"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-sm leading-snug font-semibold">
          {t('undoDeleted', { name: pending.name })}
        </span>
        {pending.recordCount > 0 && (
          <span className="text-background/70 text-[12.5px]">
            {t('undoMoved', { count: pending.recordCount })}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onUndo}
        className="border-background/25 flex h-[34px] items-center rounded-[9px] border px-3 text-[13.5px] font-bold"
      >
        {t('undoAction')}
      </button>
      <CountdownRing expiresAt={pending.expiresAt} />
    </div>
  );
}
