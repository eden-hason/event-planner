import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { GroupSide } from '@/features/guests/schemas';

/**
 * A Group's Side as a small badge after its name: the bride's side magenta, the
 * groom's violet. No side, no badge - the label is the signal, not a colour.
 */
export function SideBadge({
  side,
  className,
}: {
  side: GroupSide | null | undefined;
  className?: string;
}) {
  const t = useTranslations('guests.list.sides');
  if (!side) return null;
  return (
    <span
      className={cn(
        'inline-flex h-[18px] shrink-0 items-center rounded-[5px] px-1.5 text-[11px] font-semibold',
        side === 'bride'
          ? 'bg-primary/8 text-primary'
          : 'bg-violet-tint text-violet-strong',
        className,
      )}
    >
      {t(side)}
    </span>
  );
}
