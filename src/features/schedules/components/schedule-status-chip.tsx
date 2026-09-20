'use client';

import { useTranslations } from 'next-intl';
import {
  IconCheck,
  IconClock,
  IconLock,
  type IconProps,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import type { OutreachItemStatus } from '../types';

type ChipIcon = React.ComponentType<IconProps>;

/**
 * The five readings a Schedule has on the timeline.
 *
 * 'locked' and 'cancelled' are deliberately different chips over what is,
 * underneath, the same inert row: "off" is a decision the organiser made and
 * can reverse, "locked" is one they have not been offered. Collapsing them
 * would make a plan they turned off look identical to one they cannot reach.
 *
 * 'expired' shares the muted treatment with 'cancelled' because the outcome for
 * the guest is the same - no message - and keeps its own label because the
 * reason is not (ADR 0015).
 *
 * A call round's 'in_progress' and 'completed' land here too: the distinction
 * that matters in a list is done / in flight / abandoned, not which engine
 * produced it. They carry no icon - a round being worked shows a pulsing dot
 * instead, and a finished one has nothing to add to its label.
 */
const TONE: Record<OutreachItemStatus, string> = {
  sent: 'bg-success/10 text-success',
  completed: 'bg-success/10 text-success',
  pending: 'bg-violet-tint text-violet-strong',
  in_progress: 'bg-info-tint text-info-strong',
  locked: 'bg-warning-tint text-warning-ink',
  cancelled: 'bg-muted text-muted-foreground',
  expired: 'bg-muted text-muted-foreground',
};

const ICON: Partial<Record<OutreachItemStatus, ChipIcon>> = {
  sent: IconCheck,
  pending: IconClock,
  locked: IconLock,
};

const LABEL_KEY: Record<OutreachItemStatus, string> = {
  sent: 'sent',
  completed: 'completed',
  pending: 'pending',
  in_progress: 'inProgress',
  locked: 'locked',
  cancelled: 'cancelled',
  expired: 'expired',
};

/**
 * `sm` is the timeline card's chip: a little icon and the label. `md` is the
 * one in a Schedule's header, where the title already says what the Schedule is
 * and the chip only has to say how it stands - a touch larger, no icon.
 */
const SIZE = {
  sm: 'px-2 py-[3px] text-[11px]',
  md: 'px-[9px] py-1 text-[11.5px]',
} as const;

export function ScheduleStatusChip({
  status,
  size = 'sm',
  className,
}: {
  status: OutreachItemStatus;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const t = useTranslations('schedules.status.label');
  const Icon = size === 'sm' ? ICON[status] : undefined;
  // A round being worked is the one state that is still moving, so it says so.
  const live = status === 'in_progress';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full font-bold whitespace-nowrap',
        SIZE[size],
        TONE[status],
        className,
      )}
    >
      {live && <span aria-hidden className="size-1.5 shrink-0 animate-pulse rounded-full bg-current" />}
      {Icon && <Icon className="size-[11px] shrink-0" stroke={2.2} />}
      {t(LABEL_KEY[status] as 'sent')}
    </span>
  );
}
