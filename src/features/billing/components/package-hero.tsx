'use client';

import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { PackageCounts } from '../types';

/**
 * The package's headline number: records left, or how far over - in warning colour only
 * when over. Shared by the package sheet and the package page so they never disagree.
 */
export function PackageHeroCount({
  view,
  numberClassName,
}: {
  view: PackageCounts;
  /** The number's size, which differs between the sheet and the page. */
  numberClassName: string;
}) {
  const t = useTranslations('billing.packageSheet');
  const locale = useLocale();
  const over = view.state === 'over';
  const count = over ? view.over : view.left;

  return (
    <div
      className={cn(
        'flex items-baseline gap-2',
        over ? 'text-warning-strong' : 'text-foreground',
      )}
    >
      <span
        className={cn(
          'leading-none font-extrabold tabular-nums',
          numberClassName,
        )}
      >
        {count.toLocaleString(locale)}
      </span>
      <span className="text-base font-bold">
        {over ? t('heroOver', { count }) : t('heroLeft', { count })}
      </span>
    </div>
  );
}

/**
 * The quiet lines under a package count that explain why it differs from the guest list:
 * records deleted after they were Reached still count (ADR 0027), so the count reads higher
 * than the list; records with no phone do not (ADR 0033), so it reads lower. Nothing when
 * neither applies.
 */
export function PackageCountNotes({
  view,
  className,
}: {
  view: Pick<PackageCounts, 'uncounted' | 'reachedDeleted'>;
  className?: string;
}) {
  const t = useTranslations('billing.packageSheet');
  if (view.uncounted === 0 && view.reachedDeleted === 0) return null;

  return (
    <span
      className={cn(
        'text-muted-foreground flex flex-col text-[12.5px] tabular-nums',
        className,
      )}
    >
      {view.reachedDeleted > 0 && (
        <span>{t('reachedDeleted', { count: view.reachedDeleted })}</span>
      )}
      {view.uncounted > 0 && (
        <span>{t('uncounted', { count: view.uncounted })}</span>
      )}
    </span>
  );
}
