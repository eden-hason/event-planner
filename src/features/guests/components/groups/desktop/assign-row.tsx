'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { IconCheck, IconPencil } from '@tabler/icons-react';
import type { GuestApp } from '@/features/guests/schemas';
import type { MembershipStanding } from '@/features/guests/types';
import { rsvpPresentation } from '@/features/guests/utils';
import { avatarTintFor } from '@/lib/avatar-tint';
import { cn } from '@/lib/utils';
import { MARKS, PhoneLine, rowMarks, TINT } from '../assign-row-parts';

/**
 * One record in a desktop assign column: name and phone, seats, a pencil to
 * edit it, and + / − to mark it to move. A pending row keeps its place: a join
 * is tinted green, a leave amber with the name dimmed, and the + / − becomes
 * an undo, so colour is never the only sign. Unlike the phone, a pending row
 * shows no label - the tint says it, and the label is in its accessible name.
 * Memoized with id-taking handlers, so a toggle re-renders one row.
 */
export const AssignRow = memo(function AssignRow({
  guest,
  phone,
  standing,
  flashed,
  disabled,
  onToggleMove,
  onEdit,
}: {
  guest: GuestApp;
  /** The phone formatted for display, or empty when there is none. */
  phone: string;
  standing: MembershipStanding;
  /** The last save moved this row here. */
  flashed: boolean;
  disabled: boolean;
  onToggleMove: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const t = useTranslations('guests');
  const { pending, markKey, move } = rowMarks(standing, flashed);
  const leaving = standing === 'leaving';
  const mark = markKey && MARKS[markKey];
  // The desktop design highlights every row a save just moved in green.
  const tone = markKey === 'left' ? 'confirmed' : mark?.tone;
  const label = mark && t(`groups.assignScreen.${mark.label}`);

  return (
    <div
      aria-label={label ? `${guest.name}, ${label}` : guest.name}
      className={cn(
        'flex min-h-[58px] shrink-0 items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] transition-colors duration-700',
        tone ? TINT[tone] : 'hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full text-[13.5px] font-bold',
          avatarTintFor(guest.name),
          leaving && 'opacity-60',
        )}
      >
        {guest.name.trim().charAt(0).toUpperCase()}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'min-w-0 truncate text-sm font-semibold',
              leaving ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {guest.name}
          </span>
          {tone && !pending && (
            <span
              className={cn(
                'flex shrink-0 items-center gap-[3px] text-[11.5px] font-bold whitespace-nowrap',
                rsvpPresentation(tone).text,
              )}
            >
              <IconCheck size={13} stroke={2.4} />
              {label}
            </span>
          )}
        </div>
        <PhoneLine phone={phone} />
      </div>
      <span className="text-muted-foreground shrink-0 text-[12.5px] whitespace-nowrap tabular-nums">
        {t('groups.assignScreen.seatsCount', { count: guest.amount })}
      </span>
      <button
        type="button"
        aria-label={t('groups.assignScreen.edit', { name: guest.name })}
        title={t('groups.editGuest.dialogLabel')}
        onClick={() => onEdit(guest.id)}
        className="text-muted-foreground hover:bg-muted flex size-[30px] shrink-0 items-center justify-center rounded-lg"
      >
        <IconPencil size={16} />
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-label={t(move.label, { name: guest.name })}
        onClick={() => onToggleMove(guest.id)}
        className={cn(
          'flex size-[30px] shrink-0 items-center justify-center rounded-lg border disabled:opacity-50',
          move.className,
        )}
      >
        <move.Icon size={16} stroke={2.3} />
      </button>
    </div>
  );
});
