'use client';

import { useLocale, useTranslations } from 'next-intl';
import { IconChevronLeft, IconChevronRight, IconPackage } from '@tabler/icons-react';
import { useCollaboration } from '@/components/feature-layout';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { GuestPackageView } from '../types';
import { PackageBar } from './package-bar';

/**
 * The Record Package on the mobile More page (Record Package Plan design, 1l-1m). Counts
 * only, so every collaborator sees it; only the Event's creator gets "details", because the
 * page behind it lists payments and only they may read those.
 */
export function RecordPackageCard({
  eventId,
  view,
}: {
  eventId: string;
  view: GuestPackageView;
}) {
  const t = useTranslations('billing.packageCard');
  const tSheet = useTranslations('billing.packageSheet');
  const tGuests = useTranslations('guests.package');
  const locale = useLocale();
  const { isOwner, isCreator } = useCollaboration();
  const Chevron = locale === 'he' ? IconChevronLeft : IconChevronRight;
  const fmt = (n: number) => n.toLocaleString(locale);

  const over = view.state === 'over';
  const aside = over
    ? tGuests('over', { count: fmt(view.over) })
    : view.state === 'full'
      ? tGuests('full')
      : tGuests('left', { count: fmt(view.left) });

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-muted-foreground px-1.5 text-xs font-medium">{t('group')}</h2>
      <div className="bg-card flex flex-col gap-3 rounded-xl border p-3.5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-[10px]"
          >
            <IconPackage size={20} stroke={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-tight font-semibold">{t('title')}</p>
            {view.channel && (
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {tSheet(`channels.${view.channel}`)}
              </p>
            )}
          </div>
          {isOwner && isCreator && (
            <Link
              href={`/app/${eventId}/package`}
              className="text-primary flex h-9 items-center gap-0.5 px-1.5 text-[13.5px] font-bold"
            >
              {t('details')}
              <Chevron size={14} stroke={2.2} />
            </Link>
          )}
        </div>
        <PackageBar view={view} className="h-1.5" />
        <div className="flex justify-between gap-2.5 text-[12.5px] tabular-nums">
          <span className="text-muted-foreground">
            {tSheet('usedOf', { used: fmt(view.used), size: fmt(view.size) })}
          </span>
          <span
            className={cn(
              'font-bold',
              over || view.state === 'near' ? 'text-warning-strong' : 'text-muted-foreground',
            )}
          >
            {aside}
          </span>
        </div>
      </div>
    </section>
  );
}
