'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GuestWithGroupApp } from '@/features/guests';
import { useSeatingCopy } from './use-seating-copy';

interface SeatedGuestChipProps {
  guest: GuestWithGroupApp;
  /** Surfaced by search - ringed so the eye lands on it when the panel opens. */
  highlighted?: boolean;
  onUnassign?: () => void;
}

/**
 * A seated Guest Record. Pending assignments are visibly provisional
 * (ADR-0008) even though they reserve their places exactly like confirmed ones.
 */
export function SeatedGuestChip({
  guest,
  highlighted = false,
  onUnassign,
}: SeatedGuestChipProps) {
  const { t } = useSeatingCopy();
  const isPending = guest.rsvpStatus === 'pending';
  const heads = guest.amount ?? 1;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm',
        isPending ? 'bg-rsvp-pending/12' : 'bg-muted',
        highlighted && 'ring-primary ring-2 ring-offset-1',
      )}
    >
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          isPending ? 'bg-rsvp-pending' : 'bg-rsvp-confirmed',
        )}
      />
      <span className="min-w-0 flex-1 truncate">{guest.name}</span>
      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
        {isPending ? `${heads} · ${t('table.pending')}` : heads}
      </span>
      {onUnassign && (
        <button
          type="button"
          onClick={onUnassign}
          aria-label={t('table.unassignGuest')}
          className="text-muted-foreground hover:bg-card hover:text-foreground shrink-0 rounded p-0.5 transition-colors"
        >
          <X className="size-3" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
