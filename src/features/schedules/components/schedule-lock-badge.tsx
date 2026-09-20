import { IconLock } from '@tabler/icons-react';
import { getTranslations } from 'next-intl/server';

import { cn } from '@/lib/utils';

/**
 * Why a field on a sent Schedule cannot be changed.
 *
 * Not `ScheduleStatusChip`: that one says what state the Schedule is in, and
 * this says why a control next to it is inert. They happen to look alike
 * because both are "you cannot act here", but they answer different questions
 * and appear together - the header carries the status, each card carries the
 * reason.
 */
export async function ScheduleLockBadge({ className }: { className?: string }) {
  const t = await getTranslations('schedules.messageType.lockReason');

  return (
    <span
      className={cn(
        'bg-warning-tint text-warning-ink inline-flex items-center gap-1 rounded-full',
        'px-2 py-0.5 text-[11.5px] font-bold whitespace-nowrap',
        className,
      )}
    >
      <IconLock size={11} stroke={2.2} />
      {t('sent')}
    </span>
  );
}
