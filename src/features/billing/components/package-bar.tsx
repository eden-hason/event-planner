import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { PackageCounts } from '../types';

/** Diagonal stripes: the bonus reads as a gift and the overflow as a warning, not as more of the same. */
const hatch = (color: string, mix: number): CSSProperties => ({
  backgroundImage: `repeating-linear-gradient(135deg, ${color} 0 3px, color-mix(in oklab, ${color} ${mix}%, transparent) 3px 6px)`,
});

type Fill = { className?: string; style?: CSSProperties };

/** Each part of the package, used and free; the bar and its legend read the same fills. */
const FILL: Record<'paid' | 'paidFree' | 'bonus' | 'bonusFree' | 'over', Fill> =
  {
    paid: { className: 'bg-primary' },
    paidFree: { className: 'bg-primary/20' },
    bonus: { style: hatch('var(--violet-strong)', 70) },
    bonusFree: { style: hatch('var(--violet-strong)', 22) },
    over: { style: hatch('var(--warning-strong)', 55) },
  };

/**
 * Paid, bonus and overflow as one bar. The width is the larger of the package and the
 * list, so an over list shows its overflow beyond the package rather than squashing it.
 */
export function PackageBar({
  view,
  className,
}: {
  view: PackageCounts;
  className?: string;
}) {
  const total = Math.max(view.used, view.size) || 1;
  const usedPaid = Math.min(view.used, view.paid);
  const usedBonus = Math.min(Math.max(view.used - view.paid, 0), view.bonus);
  const segments: (Fill & { n: number })[] = [
    { n: usedPaid, ...FILL.paid },
    { n: view.paid - usedPaid, ...FILL.paidFree },
    { n: usedBonus, ...FILL.bonus },
    { n: view.bonus - usedBonus, ...FILL.bonusFree },
    { n: view.over, ...FILL.over },
  ];

  return (
    <div
      className={cn(
        'bg-muted flex h-[5px] w-full gap-[1.5px] overflow-hidden rounded-full',
        className,
      )}
    >
      {segments
        .filter((segment) => segment.n > 0)
        .map((segment, index) => (
          <div
            key={index}
            className={segment.className}
            style={{ ...segment.style, width: `${(segment.n / total) * 100}%` }}
          />
        ))}
    </div>
  );
}

/** The bar's fill for one part of the package, as a legend key. */
export function PackageSwatch({ kind }: { kind: 'paid' | 'bonus' | 'over' }) {
  return (
    <span
      aria-hidden
      className={cn('size-2.5 shrink-0 rounded-[3px]', FILL[kind].className)}
      style={FILL[kind].style}
    />
  );
}
