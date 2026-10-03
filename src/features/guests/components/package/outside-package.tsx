'use client';

import { useTranslations } from 'next-intl';
import { IconBrandWhatsapp, IconPackage } from '@tabler/icons-react';
import { useCollaboration } from '@/components/feature-layout';
import { billingWhatsAppUrl, useRecordPackage } from '@/features/billing';
import { cn } from '@/lib/utils';

/**
 * The tag on a Guest Record a Schedule would skip. Sized to sit inside the existing row:
 * the list is virtualized, so a row can never grow a line for it.
 */
export function OutsidePackageTag({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const t = useTranslations('guests.package');
  return (
    <span
      className={cn(
        'bg-warning-tint text-warning-strong inline-flex shrink-0 items-center rounded-md font-bold whitespace-nowrap',
        size === 'sm' ? 'h-[18px] px-1.5 text-[11px]' : 'h-5 px-[7px] text-[11.5px]',
      )}
    >
      {t('tag')}
    </span>
  );
}

/**
 * Above the list while it is narrowed to the records outside the package: what that
 * means, and for the Owner the way out - a WhatsApp conversation with Kululu, since
 * buying records is never a checkout (brief section 7). A collaborator is told to ask.
 */
export function OutsidePackageBanner({
  variant,
  eventName,
}: {
  variant: 'mobile' | 'desktop';
  eventName?: string;
}) {
  const t = useTranslations('guests.package');
  const { view } = useRecordPackage();
  const { isOwner } = useCollaboration();
  if (!view || view.over === 0) return null;

  const href = billingWhatsAppUrl(
    t('whatsapp', { event: eventName ?? '', count: view.over.toLocaleString() }),
  );

  return (
    <div
      className={cn(
        'bg-warning-tint text-warning-strong flex items-center rounded-xl',
        variant === 'mobile' ? 'mt-2.5 gap-2.5 px-3 py-2.5' : 'mb-2.5 gap-3 px-3.5 py-2.5',
      )}
    >
      {variant === 'desktop' && <IconPackage size={17} stroke={2} className="shrink-0" />}
      <span
        className={cn(
          'flex-1 leading-[1.45] font-medium text-pretty',
          variant === 'mobile' ? 'text-[12.5px]' : 'text-[13.5px]',
        )}
      >
        {isOwner ? t('bannerOwner') : t('bannerCollaborator')}
      </span>
      {isOwner && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-card text-foreground flex h-[34px] shrink-0 items-center gap-[5px] rounded-[9px] px-3 text-[13px] font-bold whitespace-nowrap"
        >
          <IconBrandWhatsapp size={15} stroke={2} />
          {t('addRecords')}
        </a>
      )}
    </div>
  );
}

/**
 * The one line the `?guest=` drawer adds for a record outside the package. The Owner also
 * gets a way to the package details; a collaborator gets the fact without the money.
 */
export function OutsidePackageNotice({ guestId }: { guestId: string }) {
  const t = useTranslations('guests.package');
  const { outsideIds, canOpenSheet, openSheet } = useRecordPackage();
  if (!outsideIds.has(guestId)) return null;

  return (
    <div className="bg-warning-tint text-warning-strong flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-[13.5px] font-semibold">
      <IconPackage size={17} stroke={2} className="shrink-0" />
      <span className="min-w-0 flex-1">{t('drawerLine')}</span>
      {canOpenSheet && (
        <button
          type="button"
          onClick={() => openSheet()}
          className="font-bold whitespace-nowrap underline underline-offset-[3px]"
        >
          {t('drawerLink')}
        </button>
      )}
    </div>
  );
}
