import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { GuestPackageView } from '../types';

/** Diagonal stripes: the bonus reads as a gift and the overflow as a warning, not as more of the same. */
const hatch = (color: string, mix: number): CSSProperties => ({
  backgroundImage: `repeating-linear-gradient(135deg, ${color} 0 3px, color-mix(in oklab, ${color} ${mix}%, transparent) 3px 6px)`,
});

/**
 * Paid, bonus and overflow as one bar. The width is the larger of the package and the
 * list, so an over list shows its overflow beyond the package rather than squashing it.
 */
export function PackageBar({
  view,
  className,
}: {
  view: GuestPackageView;
  className?: string;
}) {
  const total = Math.max(view.used, view.size) || 1;
  const usedPaid = Math.min(view.used, view.paid);
  const usedBonus = Math.min(Math.max(view.used - view.paid, 0), view.bonus);
  const segments: { n: number; className?: string; style?: CSSProperties }[] = [
    { n: usedPaid, className: 'bg-primary' },
    { n: view.paid - usedPaid, className: 'bg-primary/20' },
    { n: usedBonus, style: hatch('var(--violet-strong)', 70) },
    { n: view.bonus - usedBonus, style: hatch('var(--violet-strong)', 22) },
    { n: view.over, style: hatch('var(--warning-strong)', 55) },
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

const SWATCH: Record<'paid' | 'bonus' | 'over', { className?: string; style?: CSSProperties }> = {
  paid: { className: 'bg-primary' },
  bonus: { style: hatch('var(--violet-strong)', 70) },
  over: { style: hatch('var(--warning-strong)', 55) },
};

/** The bar's fill for one part of the package, as a legend key. */
export function PackageSwatch({ kind }: { kind: 'paid' | 'bonus' | 'over' }) {
  return (
    <span
      aria-hidden
      className={cn('size-2.5 shrink-0 rounded-[3px]', SWATCH[kind].className)}
      style={SWATCH[kind].style}
    />
  );
}
