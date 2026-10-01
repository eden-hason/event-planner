import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { GroupSide } from '@/features/guests/schemas';

/**
 * The tinted background + text colour for anything coloured by a Group's Side
 * (badges, group icon tiles), so every surface reads the same colour. No side
 * falls back to muted.
 */
export function sideTintClass(side: GroupSide | null | undefined): string {
  if (side === 'bride') return 'bg-primary/10 text-primary';
  if (side === 'groom') return 'bg-violet-tint text-violet-strong';
  return 'bg-muted text-muted-foreground';
}

/** The solid colour of a Side, for dots and meter bars. */
export function sideSolidClass(side: GroupSide): string {
  return side === 'bride' ? 'bg-primary' : 'bg-violet-strong';
}

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
        sideTintClass(side),
        className,
      )}
    >
      {t(side)}
    </span>
  );
}
