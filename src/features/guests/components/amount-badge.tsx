'use client';

import { useTranslations } from 'next-intl';
import { IconUser, IconUserEdit } from '@tabler/icons-react';
import type { AmountDisplay } from '@/features/guests/utils/guest-amount';
import { cn } from '@/lib/utils';

/**
 * A Guest Record's count as a blue chip. A pencil on the person marks a count
 * the Guest changed in their own answer, with the invitation in its tooltip.
 */
export function AmountBadge({
  count,
  size = 'md',
}: {
  count: AmountDisplay;
  /** `sm` for the phone card, `md` for the desktop table. */
  size?: 'sm' | 'md';
}) {
  const t = useTranslations('guests.list');
  const Icon = count.changedByGuest ? IconUserEdit : IconUser;
  const sm = size === 'sm';

  return (
    <span
      title={
        count.changedByGuest
          ? t('amountChangedHint', {
              invited: count.invited,
              coming: count.value,
            })
          : undefined
      }
      className={cn(
        'inline-flex items-center bg-sky-100 font-bold text-sky-700 tabular-nums dark:bg-sky-400/15 dark:text-sky-300',
        sm
          ? 'h-[18px] gap-[3px] rounded-md px-[5px] text-[11px]'
          : 'h-[22px] gap-[5px] rounded-[7px] ps-1.5 pe-[7px] text-[13px]',
        count.changedByGuest && 'cursor-help',
      )}
    >
      <Icon size={sm ? 11 : 13} stroke={sm ? 2.3 : 2.2} />
      {count.value}
    </span>
  );
}
