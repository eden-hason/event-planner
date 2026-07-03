'use client';

import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GroupIcon } from '@/features/guests/components/groups/group-icon';
import type { GuestWithGroupApp } from '@/features/guests/schemas';

interface GuestCardProps {
  guest: GuestWithGroupApp;
  variant?: 'panel' | 'tableSlot';
  onUnassign?: () => void;
}

export function GuestCard({ guest, variant = 'panel', onUnassign }: GuestCardProps) {
  const draggableId = `guest:${guest.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId,
    data: {
      type: 'guest',
      guestId: guest.id,
      currentTableId: guest.tableId ?? null,
    },
  });

  const rsvpDotClass =
    guest.rsvpStatus === 'confirmed'
      ? 'bg-green-500'
      : guest.rsvpStatus === 'declined'
        ? 'bg-red-400'
        : 'bg-amber-400';

  const rowClass = cn(
    'group flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm shadow-sm',
    guest.rsvpStatus === 'pending' && 'opacity-70',
    guest.rsvpStatus === 'declined' && 'opacity-60 line-through',
    isDragging && 'opacity-30',
  );

  return (
    <div
      ref={setNodeRef}
      className={rowClass}
      {...listeners}
      {...attributes}
      role="button"
      aria-label={`Drag ${guest.name}`}
      style={{ touchAction: 'none' }}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className={cn('h-2 w-2 rounded-full shrink-0', rsvpDotClass)} aria-hidden />
      {guest.group?.icon ? (
        <GroupIcon iconName={guest.group.icon} size="sm" className="text-muted-foreground shrink-0" />
      ) : null}
      <span className="flex-1 truncate font-medium">{guest.name}</span>
      {guest.amount > 1 ? (
        <span className="text-xs text-muted-foreground shrink-0">×{guest.amount}</span>
      ) : null}
      {variant === 'tableSlot' && onUnassign ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnassign();
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
