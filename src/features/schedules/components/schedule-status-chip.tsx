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
 * produced it.
 */
const TONE: Record<OutreachItemStatus, string> = {
  sent: 'bg-success/10 text-success',
  completed: 'bg-success/10 text-success',
  pending: 'bg-primary/10 text-primary',
  in_progress: 'bg-primary/10 text-primary',
  locked: 'bg-warning/10 text-warning',
  cancelled: 'bg-muted text-muted-foreground',
  expired: 'bg-muted text-muted-foreground',
};

const ICON: Partial<Record<OutreachItemStatus, ChipIcon>> = {
  sent: IconCheck,
  completed: IconCheck,
  pending: IconClock,
  in_progress: IconClock,
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

export function ScheduleStatusChip({
  status,
  className,
}: {
  status: OutreachItemStatus;
  className?: string;
}) {
  const t = useTranslations('schedules.status.label');
  const Icon = ICON[status];

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5',
        'text-[11px] font-bold whitespace-nowrap',
        TONE[status],
        className,
      )}
    >
      {Icon && <Icon className="size-3 shrink-0" stroke={2.4} />}
      {t(LABEL_KEY[status] as 'sent')}
    </span>
  );
}
