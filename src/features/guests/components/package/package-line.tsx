'use client';

import { useLocale, useTranslations } from 'next-intl';
import { IconChevronLeft, IconChevronRight, IconPackage } from '@tabler/icons-react';
import { PackageBar, useRecordPackage } from '@/features/billing';
import { cn } from '@/lib/utils';

/**
 * The Record Package on the Guests page (Record Package Guests design): one quiet line
 * under the RSVP meter on a phone, a small card beside it on desktop. Warning colour only
 * while the list is over the package.
 *
 * A tap opens the package sheet, which only the Owner gets; over the package, it can
 * narrow the list to the records outside it from there. A collaborator has no sheet, so
 * over the package their tap narrows the list straight away, and otherwise the line is
 * information only.
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
  const { view, canOpenSheet, openSheet } = useRecordPackage();

  if (!view) return null;

  const over = view.state === 'over';
  const interactive = canOpenSheet || over;
  const onClick = canOpenSheet ? () => openSheet({ onShowOutside }) : onShowOutside;
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
    </>
  );
}
