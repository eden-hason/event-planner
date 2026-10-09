'use client';

import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { billingWhatsAppUrl } from '../utils';
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
 * The quiet line under a package count when some Guest Records have no phone (ADR 0033):
 * they are in the list but not in the count, so the count reads lower than the list.
 * Nothing when every record has a phone.
 */
export function PackageUncountedNote({
  view,
  className,
}: {
  view: Pick<PackageCounts, 'uncounted'>;
  className?: string;
}) {
  const t = useTranslations('billing.packageSheet');
  if (view.uncounted === 0) return null;

  return (
    <span className={cn('text-muted-foreground text-[12.5px] tabular-nums', className)}>
      {t('uncounted', { count: view.uncounted })}
    </span>
  );
}

/** "Add records" is a WhatsApp conversation; over the package it says by how much. */
export function usePackageWhatsAppHref(
  view: PackageCounts,
  eventName?: string,
): string {
  const t = useTranslations('billing.packageSheet');
  const locale = useLocale();
  const event = eventName ?? '';
  return billingWhatsAppUrl(
    view.state === 'over'
      ? t('whatsappOver', { event, count: view.over.toLocaleString(locale) })
      : t('whatsapp', { event }),
  );
}
