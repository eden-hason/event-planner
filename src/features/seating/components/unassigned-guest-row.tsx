'use client';

import { useDraggable } from '@dnd-kit/core';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GuestWithGroupApp } from '@/features/guests';
import { useSeatingCopy } from './use-seating-copy';

interface UnassignedGuestRowProps {
  guest: GuestWithGroupApp;
  selected: boolean;
  onToggle: () => void;
  onAssign: () => void;
  /** Drag is a desktop speed enhancement; the Assign button is the real path. */
  draggable?: boolean;
  /** Off inside a group section, where the heading already names the group. */
  showGroup?: boolean;
}

export function UnassignedGuestRow({
  guest,
  selected,
  onToggle,
  onAssign,
  draggable = false,
  showGroup = true,
}: UnassignedGuestRowProps) {
  const { t } = useSeatingCopy();
  const heads = guest.amount ?? 1;
  const isPending = guest.rsvpStatus === 'pending';

  // Composed rather than one string per combination: the group name drops out
  // inside a group section. Pending state is carried by the status dot, not
  // spelled out here.
  const meta = [
    showGroup ? (guest.group?.name ?? t('unassigned.noGroup')) : null,
    t('unassigned.heads', { heads }),
  ]
    .filter(Boolean)
    .join(' · ');

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `guest:${guest.id}`,
    disabled: !draggable,
    data: { type: 'guest', guestId: guest.id, currentTableId: guest.tableId ?? null },
  });

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/60',
        isDragging && 'opacity-50',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={t('unassigned.selectGuest')}
        aria-pressed={selected}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
          selected ? 'border-primary bg-primary' : 'border-border bg-card',
        )}
      >
        <Check
          className={cn(
            'text-primary-foreground size-3.5',
            selected ? 'opacity-100' : 'opacity-0',
          )}
          strokeWidth={3.5}
        />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'size-2 shrink-0 rounded-full',
              isPending ? 'bg-rsvp-pending' : 'bg-rsvp-confirmed',
            )}
          />
          <span className="truncate text-sm font-medium">{guest.name}</span>
        </div>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">{meta}</p>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={onAssign} className="shrink-0">
        {t('unassigned.assign')}
      </Button>
    </div>
  );
}
