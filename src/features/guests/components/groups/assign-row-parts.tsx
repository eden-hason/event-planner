'use client';

import { useTranslations } from 'next-intl';
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconMinus,
  IconPlus,
} from '@tabler/icons-react';
import type { MembershipStanding } from '@/features/guests/types';
import { rsvpPresentation } from '@/features/guests/utils';
import { cn } from '@/lib/utils';

/**
 * What the desktop and mobile assign rows share: how a row is marked, tinted
 * and moved for its standing against the draft, and its phone line. The rows
 * differ only in layout.
 */

/** A row's mark: a move pending on Save, or one the last save just made. */
export const MARKS = {
  joining: { tone: 'confirmed', label: 'willJoin', Icon: IconArrowLeft },
  leaving: { tone: 'pending', label: 'willLeave', Icon: IconArrowRight },
  joined: { tone: 'confirmed', label: 'justJoined', Icon: IconCheck },
  left: { tone: 'pending', label: 'justLeft', Icon: IconCheck },
} as const;

export type MarkKey = keyof typeof MARKS;

/** Only the surface is tinted - the text keeps its own colours. */
export const TINT = {
  confirmed: 'bg-rsvp-confirmed-tint',
  pending: 'bg-rsvp-pending-tint',
} as const;

/** The + / − button, or its undo once the row is pending. */
export const MOVE = {
  pending: {
    Icon: IconArrowBackUp,
    label: 'groups.assignScreen.undoMove',
    className: 'bg-card text-foreground hover:bg-muted',
  },
  out: {
    Icon: IconPlus,
    label: 'groups.desktop.addOne',
    className:
      'bg-primary/10 text-primary hover:bg-primary/15 border-transparent',
  },
  in: {
    Icon: IconMinus,
    label: 'groups.desktop.removeOne',
    className:
      'bg-muted text-muted-foreground hover:bg-muted/70 border-transparent',
  },
} as const;

/** The mark and move button for a row, from where it stands. */
export function rowMarks(standing: MembershipStanding, flashed: boolean) {
  const pending = standing === 'joining' || standing === 'leaving';
  const markKey: MarkKey | null = pending
    ? standing
    : flashed
      ? standing === 'in'
        ? 'joined'
        : 'left'
      : null;
  return { pending, markKey, move: MOVE[pending ? 'pending' : standing] };
}

/** The phone under the name, or an amber "no phone" flag (ADR 0033). */
export function PhoneLine({ phone }: { phone: string }) {
  const t = useTranslations('guests.groups.assignScreen');
  return phone ? (
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
      {t('noPhone')}
    </span>
  );
}
