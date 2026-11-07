'use client';

import { useLocale, useTranslations } from 'next-intl';
import { IconChevronRight, IconPackage } from '@tabler/icons-react';
import { packageAside, useRecordPackage } from '@/features/billing';
import { cn } from '@/lib/utils';

/**
 * The Record Package on the Guests page (Guests table controls design): a strip along the
 * bottom of the RSVP overview card, the same on desktop and on a phone - the count at its
 * start and what is left, or what it takes to send, at its end. Warning colour only while
 * the list is near or over the package.
 *
 * A tap opens the package sheet, which only the Owner gets; over the package, it can
 * narrow the list to the records outside it from there. A collaborator has no sheet, so
 * over the package their tap narrows the list straight away, and otherwise the strip is
 * information only.
 *
 * Records with no phone are not counted (ADR 0033); the package sheet says how many.
 */
export function PackageLine({ onShowOutside }: { onShowOutside: () => void }) {
  const t = useTranslations('guests.package');
  const locale = useLocale();
  const { view, openSheet } = useRecordPackage();

  if (!view) return null;

  const fmt = (n: number) => n.toLocaleString(locale);
  const tone = packageAside(view).warn ? 'text-warning-strong' : 'text-muted-foreground';
  const hint =
    view.state === 'over'
      ? t('card.over', { over: view.over })
      : view.state === 'full'
        ? t('card.full')
        : view.state === 'near'
          ? t('card.near', { left: view.left })
          : view.bonus > 0
            ? t('card.roomWithBonus', { left: fmt(view.left), bonus: fmt(view.bonus) })
            : t('card.room', { left: fmt(view.left) });

  return (
    <button
      type="button"
      onClick={() => openSheet({ onShowOutside })}
      className="bg-muted/40 hover:bg-muted/70 flex min-h-10 w-full flex-wrap items-center gap-x-2 gap-y-0.5 border-t py-2 ps-4 pe-3 text-start text-[13px] transition-colors"
    >
      <IconPackage size={16} stroke={1.8} className="text-primary shrink-0" />
      <span className="text-muted-foreground whitespace-nowrap">
        {t('card.title')}{' '}
        <b className="text-foreground font-bold tabular-nums">
          {t('card.count', { used: fmt(view.used), size: fmt(view.size) })}
        </b>
      </span>
      <span className="flex-1" />
      <span className={cn('font-medium whitespace-nowrap tabular-nums', tone)}>{hint}</span>
      <IconChevronRight size={15} stroke={2.2} className="text-muted-foreground shrink-0 rtl:rotate-180" />
    </button>
  );
}
