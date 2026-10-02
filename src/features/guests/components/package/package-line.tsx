'use client';

import type { CSSProperties } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { IconChevronLeft, IconChevronRight, IconPackage } from '@tabler/icons-react';
import { useCollaboration } from '@/components/feature-layout';
import { useBillingSheet, useRecordPackage, type GuestPackageView } from '@/features/billing';
import { cn } from '@/lib/utils';

/** Diagonal stripes: the bonus reads as a gift and the overflow as a warning, not as more of the same. */
const hatch = (color: string, mix: number): CSSProperties => ({
  backgroundImage: `repeating-linear-gradient(135deg, ${color} 0 3px, color-mix(in oklab, ${color} ${mix}%, transparent) 3px 6px)`,
});

/**
 * Paid, bonus and overflow as one thin bar. The width is the larger of the package and
 * the list, so an over list shows its overflow beyond the package rather than squashing it.
 */
function PackageBar({ view }: { view: GuestPackageView }) {
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
    <div className="bg-muted flex h-[5px] w-full gap-[1.5px] overflow-hidden rounded-full">
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

/**
 * The Record Package on the Guests page (Record Package Guests design): one quiet line
 * under the RSVP meter on a phone, a small card beside it on desktop. Warning colour only
 * while the list is over the package.
 *
 * Over, a tap narrows the list to the records outside the package - that is the question
 * the Owner has at that moment. Otherwise it opens the billing sheet, which only the
 * Owner gets; for a collaborator the line is information only.
 */
export function PackageLine({
  variant,
  onShowOutside,
}: {
  variant: 'mobile' | 'desktop';
  onShowOutside: () => void;
}) {
  const t = useTranslations('guests.package');
  const locale = useLocale();
  const { view } = useRecordPackage();
  const { isOwner } = useCollaboration();
  const { canPrompt, openSheet, sheet } = useBillingSheet();

  if (!view) return null;

  const over = view.state === 'over';
  const interactive = over || (isOwner && canPrompt);
  const onClick = over ? onShowOutside : openSheet;
  const Chevron = locale === 'he' ? IconChevronLeft : IconChevronRight;
  const fmt = (n: number) => n.toLocaleString(locale);

  const usedLine = t('usedLine', { used: fmt(view.used), size: fmt(view.size) });
  const aside = over
    ? t('over', { count: fmt(view.over) })
    : view.state === 'full'
      ? t('full')
      : t('left', { count: fmt(view.left) });
  const asideTone =
    over || view.state === 'near' ? 'text-warning-strong' : 'text-muted-foreground';

  const Root = interactive ? 'button' : 'div';
  const rootProps = interactive ? { type: 'button' as const, onClick } : {};

  if (variant === 'mobile') {
    return (
      <>
        <Root
          {...rootProps}
          className={cn(
            'flex h-[38px] w-full items-center gap-[7px] border-t px-3.5 text-start text-[12.5px]',
            over ? 'bg-warning-tint text-warning-strong' : 'text-muted-foreground',
          )}
        >
          <IconPackage
            size={15}
            stroke={2}
            className={cn('shrink-0', over ? 'text-warning-strong' : 'text-muted-foreground/80')}
          />
          <span className="whitespace-nowrap tabular-nums">{usedLine}</span>
          <span className="flex-1" />
          <span className={cn('font-bold whitespace-nowrap tabular-nums', asideTone)}>{aside}</span>
          {interactive && <Chevron size={14} stroke={2.2} className="shrink-0" />}
        </Root>
        {sheet}
      </>
    );
  }

  return (
    <>
      <div className="bg-border h-10 w-px shrink-0" />
      <Root
        {...rootProps}
        className={cn(
          'flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-start',
          over
            ? 'bg-warning-tint border-warning-tint-border text-warning-strong'
            : 'bg-card text-muted-foreground',
          interactive && !over && 'hover:bg-muted/60 transition-colors',
        )}
      >
        <IconPackage
          size={18}
          stroke={2}
          className={over ? 'text-warning-strong' : 'text-muted-foreground/80'}
        />
        <div className="flex min-w-[180px] flex-col gap-1.5">
          <div className="flex items-baseline gap-2.5 text-[13px] whitespace-nowrap tabular-nums">
            <span>{usedLine}</span>
            <span className={cn('font-bold', asideTone)}>{aside}</span>
          </div>
          <PackageBar view={view} />
        </div>
        {interactive && <Chevron size={15} stroke={2.2} />}
      </Root>
      {sheet}
    </>
  );
}
