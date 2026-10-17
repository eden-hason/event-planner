'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconMinus,
  IconPencil,
  IconPlus,
} from '@tabler/icons-react';
import type { GuestApp } from '@/features/guests/schemas';
import type { MembershipStanding } from '@/features/guests/types';
import { rsvpPresentation } from '@/features/guests/utils';
import { avatarTintFor } from '@/lib/avatar-tint';
import { cn } from '@/lib/utils';

/** A row's mark: a move pending on Save, or one the last save just made. */
const MARKS = {
  joining: { tone: 'confirmed', label: 'willJoin', Icon: IconArrowLeft },
  leaving: { tone: 'pending', label: 'willLeave', Icon: IconArrowRight },
  joined: { tone: 'confirmed', label: 'justJoined', Icon: IconCheck },
  left: { tone: 'pending', label: 'justLeft', Icon: IconCheck },
} as const;

/** Only the surface is tinted - the text keeps its own colours. */
const TINT = {
  confirmed: 'bg-rsvp-confirmed-tint',
  pending: 'bg-rsvp-pending-tint',
} as const;

const MOVE = {
  pending: {
    Icon: IconArrowBackUp,
    label: 'groups.assignScreen.undoMove',
    className: 'bg-card text-foreground',
  },
  out: {
    Icon: IconPlus,
    label: 'groups.desktop.addOne',
    className: 'bg-primary/10 text-primary border-transparent',
  },
  in: {
    Icon: IconMinus,
    label: 'groups.desktop.removeOne',
    className: 'bg-muted text-muted-foreground border-transparent',
  },
} as const;

/**
 * One record in the assign screen. Pending rows keep their place: a join is
 * tinted green, a leave amber with the name dimmed, and the + / − becomes an
 * undo. The label carries the meaning too, so it never rests on colour alone.
 * Memoized with id-taking handlers, so a toggle re-renders only its own row.
 */
export const AssignRow = memo(function AssignRow({
  guest,
  phone,
  standing,
  flashed,
  selectMode,
  checked,
  disabled,
  onToggleSelect,
  onToggleMove,
  onEdit,
}: {
  guest: GuestApp;
  /** The phone formatted for display, or empty when there is none. */
  phone: string;
  standing: MembershipStanding;
  /** The last save moved this row here. */
  flashed: boolean;
  selectMode: boolean;
  checked: boolean;
  disabled: boolean;
  onToggleSelect: (id: string) => void;
  onToggleMove: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const t = useTranslations('guests');
  const pending = standing === 'joining' || standing === 'leaving';
  const leaving = standing === 'leaving';
  const on = selectMode && checked;

  const mark = pending
    ? MARKS[standing]
    : flashed
      ? MARKS[standing === 'in' ? 'joined' : 'left']
      : null;
  const label = mark && t(`groups.assignScreen.${mark.label}`);
  const move = MOVE[pending ? 'pending' : standing];

  return (
    <div
      role={selectMode ? 'checkbox' : undefined}
      aria-checked={selectMode ? checked : undefined}
      aria-label={label ? `${guest.name}, ${label}` : guest.name}
      tabIndex={selectMode ? 0 : undefined}
      onClick={selectMode ? () => onToggleSelect(guest.id) : undefined}
      onKeyDown={
        selectMode
          ? (e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onToggleSelect(guest.id);
              }
            }
          : undefined
      }
      className={cn(
        'flex min-h-[62px] shrink-0 items-center gap-[9px] rounded-[14px] border px-2.5 py-[9px] transition-[background-color,box-shadow] duration-700',
        mark ? TINT[mark.tone] : on ? 'bg-primary/8' : 'bg-card',
        mark && !on && 'border-transparent',
        on && 'border-primary ring-primary ring-1',
        selectMode && 'cursor-pointer',
      )}
    >
      {selectMode && (
        <span
          className={cn(
            'flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px]',
            checked
              ? 'border-primary bg-primary text-white'
              : 'border-muted-foreground/30 bg-card',
          )}
        >
          {checked && <IconCheck size={15} stroke={3} />}
        </span>
      )}
      <span
        className={cn(
          'flex size-[38px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold',
          avatarTintFor(guest.name),
          leaving && 'opacity-60',
        )}
      >
        {guest.name.trim().charAt(0).toUpperCase()}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              'min-w-0 truncate text-[15px] font-semibold',
              leaving ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {guest.name}
          </span>
          {mark && (
            <span
              className={cn(
                'flex shrink-0 items-center gap-[3px] text-[11.5px] font-bold whitespace-nowrap',
                rsvpPresentation(mark.tone).text,
              )}
            >
              <mark.Icon
                size={13}
                stroke={2.4}
                // The arrow points at the tab the record moves to.
                className={cn(pending && 'ltr:-scale-x-100')}
              />
              {label}
            </span>
          )}
        </div>
        {phone ? (
          <span
            dir="ltr"
            className="text-muted-foreground self-start text-[12.5px] whitespace-nowrap tabular-nums"
          >
            {phone}
          </span>
        ) : (
          <span
            className={cn(
              rsvpPresentation('pending').text,
              'self-start text-[12.5px] font-semibold whitespace-nowrap',
            )}
          >
            {t('groups.assignScreen.noPhone')}
          </span>
        )}
      </div>
      <span className="flex min-w-[30px] shrink-0 flex-col items-center">
        <b className="text-[15px] leading-tight font-bold tabular-nums">
          {guest.amount}
        </b>
        <span className="text-muted-foreground text-[10.5px]">
          {t('groups.assignScreen.seats')}
        </span>
      </span>
      <button
        type="button"
        aria-label={t('groups.assignScreen.edit', { name: guest.name })}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(guest.id);
        }}
        className="text-muted-foreground hover:bg-muted flex size-[34px] shrink-0 items-center justify-center rounded-[10px]"
      >
        <IconPencil size={17} />
      </button>
      {!selectMode && (
        <button
          type="button"
          disabled={disabled}
          aria-label={t(move.label, { name: guest.name })}
          onClick={() => onToggleMove(guest.id)}
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-[10px] border disabled:opacity-50',
            move.className,
          )}
        >
          <move.Icon size={18} stroke={2.3} />
        </button>
      )}
    </div>
  );
});
