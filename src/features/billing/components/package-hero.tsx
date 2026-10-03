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
