'use client';

import { useLocale, useTranslations } from 'next-intl';
import { IconAlertTriangle, IconBrandWhatsapp } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { billingWhatsAppUrl } from '../utils';
import type { GuestPackageView } from '../types';
import { PackageBar } from './package-bar';

type RecordPackageSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: GuestPackageView;
  eventName?: string;
  /** Present when the opener can narrow its list to the records outside the package. */
  onShowOutside?: () => void;
};

/**
 * The Owner's billing sheet for the Record Package (Record Package Plan design, 1i-1k): how
 * much room is left or how far over the list is, what the package is made of, and the way to
 * grow it. Buying records is a WhatsApp conversation with Kululu, never a checkout. A bottom
 * drawer on a phone, a dialog on desktop.
 */
export function RecordPackageSheet({
  open,
  onOpenChange,
  view,
  eventName,
  onShowOutside,
}: RecordPackageSheetProps) {
  const t = useTranslations('billing.packageSheet');
  const locale = useLocale();
  const isMobile = useIsMobile();
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const Title = isMobile ? DrawerTitle : DialogTitle;
  const Description = isMobile ? DrawerDescription : DialogDescription;
  const fmt = (n: number) => n.toLocaleString(locale);

  const over = view.state === 'over';
  const heroCount = over ? view.over : view.left;
  const message = over
    ? t('whatsappOver', { event: eventName ?? '', count: fmt(view.over) })
    : t('whatsapp', { event: eventName ?? '' });

  const status = [
    view.gifted ? t('gifted') : t('paid'),
    view.channel ? t(`channels.${view.channel}`) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const breakdown = [
    {
      label: view.gifted ? t('giftedRecords') : t('paidRecords'),
      value: fmt(view.paid),
    },
    { label: t('bonusRecords'), value: `+${fmt(view.bonus)}`, bonus: true },
    { label: t('total'), value: fmt(view.size), total: true },
  ];

  const body = (
    <div
      className={cn(
        'flex flex-col gap-4 text-start',
        isMobile && 'px-4 pt-3 pb-7',
      )}
    >
      <div className="flex flex-col gap-1">
        <Title className="text-[19px] font-extrabold">{t('title')}</Title>
        <Description className="text-muted-foreground flex items-center gap-1.5 text-[13.5px]">
          <span className="bg-success size-[7px] shrink-0 rounded-full" />
          {status}
        </Description>
      </div>

      <div className="flex flex-col gap-2.5">
        <div
          className={cn(
            'flex items-baseline gap-2',
            over ? 'text-warning-strong' : 'text-foreground',
          )}
        >
          <span className="text-[40px] leading-none font-extrabold tabular-nums">
            {fmt(heroCount)}
          </span>
          <span className="text-base font-bold">
            {over
              ? t('heroOver', { count: heroCount })
              : t('heroLeft', { count: heroCount })}
          </span>
        </div>
        <PackageBar view={view} className="h-2.5 gap-0.5" />
        <span className="text-muted-foreground text-[13.5px] tabular-nums">
          {t('usedOf', { used: fmt(view.used), size: fmt(view.size) })}
        </span>
      </div>

      <div className="bg-muted/60 flex flex-col rounded-[14px] px-3.5 py-1">
        <span className="text-muted-foreground pt-2.5 pb-1 text-[12.5px] font-bold">
          {t('breakdownTitle')}
        </span>
        {breakdown.map((row) => (
          <div
            key={row.label}
            className={cn(
              'flex min-h-10 items-center justify-between gap-3 border-t',
              row.total && 'border-foreground/15',
            )}
          >
            <span
              className={cn(
                'text-[14.5px]',
                row.total ? 'font-bold' : 'font-medium',
              )}
            >
              {row.label}
            </span>
            <span
              className={cn(
                'text-[15.5px] tabular-nums',
                row.total ? 'font-extrabold' : 'font-semibold',
                row.bonus && 'text-violet-strong',
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {over && (
        <div className="bg-warning-tint text-warning-strong flex min-h-[42px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold">
          <IconAlertTriangle size={17} stroke={2} className="shrink-0" />
          {t('overWarning', { count: view.over })}
        </div>
      )}

      <Button asChild>
        <a
          href={billingWhatsAppUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconBrandWhatsapp />
          {t('addRecords')}
        </a>
      </Button>

      {over && onShowOutside && (
        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onShowOutside();
          }}
          className="text-primary -mt-2 flex h-10 items-center justify-center text-[14.5px] font-bold"
        >
          {t('showOutside')}
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent dir={dir} className="mx-auto max-w-md">
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={dir}
        className="sm:max-w-md"
        // Nothing here wants the keyboard first; without this the close X shows a focus ring.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {body}
      </DialogContent>
    </Dialog>
  );
}
