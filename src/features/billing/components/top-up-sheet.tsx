'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { IconBrandWhatsapp, IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useSaveGatedClick } from '@/features/auth';
import {
  RECORD_PACKAGE_RATES,
  TOP_UP_STEP,
  billingWhatsAppUrl,
  clampTopUp,
  formatShekels,
  suggestedTopUp,
  topUpTotal,
  type PricingChannel,
} from '../utils';
import type { PackageCounts } from '../types';

type TopUpSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: PackageCounts;
  /** The package's own Plan: a Top-up is never bought on another (ADR 0042). */
  plan: PricingChannel;
  eventName?: string;
};

/**
 * Adding records to a package that is already open (ADR 0042): how many, in steps of 10
 * with no ceiling, on the package's own Plan and at its rate, with no Bonus Records.
 * Checkout is a WhatsApp conversation with Kululu, pre-filled with the quote, like the
 * first purchase. A bottom drawer on a phone, a dialog on desktop. Memoized: the Guests page
 * keeps it mounted, closed, under every keystroke in its search.
 */
export const TopUpSheet = React.memo(function TopUpSheet({
  open,
  onOpenChange,
  view,
  plan,
  eventName,
}: TopUpSheetProps) {
  const t = useTranslations('billing.topUp');
  const tUpgrade = useTranslations('billing.upgrade');
  const tSheet = useTranslations('billing.packageSheet');
  const locale = useLocale();
  const isMobile = useIsMobile();
  const gatePay = useSaveGatedClick('pay');
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const Title = isMobile ? DrawerTitle : DialogTitle;
  const Description = isMobile ? DrawerDescription : DialogDescription;

  // The field holds what is typed; the quote always reads the snapped count.
  const [draft, setDraft] = React.useState(() => String(suggestedTopUp(view.over)));
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(String(suggestedTopUp(view.over)));
  }
  const records = clampTopUp(Number.parseInt(draft, 10));

  const fmt = (n: number) => n.toLocaleString(locale);
  const total = formatShekels(topUpTotal(records, plan), locale);
  const rate = formatShekels(RECORD_PACKAGE_RATES[plan], locale);
  const planName = tSheet(`channels.${plan}`);
  const stillOver = Math.max(0, view.over - records);

  const payHref = billingWhatsAppUrl(
    t('whatsApp', {
      event: eventName ?? '',
      plan: planName,
      records: fmt(records),
      total,
    }),
  );

  const step = (delta: number) => setDraft(String(clampTopUp(records + delta)));

  const body = (
    <div className={cn('flex flex-col gap-4 text-start', isMobile && 'px-4 pt-3 pb-7')}>
      <div className="flex flex-col gap-1.5">
        <Title className="text-[19px] font-extrabold">{t('title')}</Title>
        <Description className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[13.5px]">
          <span className="bg-muted text-foreground flex h-[26px] items-center rounded-full px-2.5 text-[12.5px] font-semibold">
            {planName}
          </span>
          {t('planNote', { rate })}
        </Description>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="top-up-records" className="text-[14.5px] font-bold">
          {t('recordsLabel')}
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-xl text-xl"
            onClick={() => step(-TOP_UP_STEP)}
            disabled={records <= TOP_UP_STEP}
            aria-label={tUpgrade('fewer', { step: TOP_UP_STEP })}
          >
            −
          </Button>
          <Input
            id="top-up-records"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
            onBlur={() => setDraft(String(records))}
            className="h-11 flex-1 rounded-xl text-center text-[22px] font-extrabold tabular-nums md:text-[22px]"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-xl text-xl"
            onClick={() => step(TOP_UP_STEP)}
            aria-label={tUpgrade('more', { step: TOP_UP_STEP })}
          >
            +
          </Button>
        </div>
        <span className="text-muted-foreground text-[12.5px]">{t('recordsHint')}</span>
      </div>

      <div aria-live="polite" className="bg-muted/60 flex flex-col rounded-[14px] px-3.5 py-1">
        <Row label={t('lineRecords', { count: fmt(records), rate })} value={total} strong />
        <Row label={t('packageAfter')} value={fmt(view.size + records)} className="border-t" />
        {stillOver > 0 && (
          <Row
            label={t('stillOver')}
            value={fmt(stillOver)}
            className="text-warning-strong border-t"
          />
        )}
      </div>

      <Button asChild size="lg" className="h-[52px] rounded-[14px] text-base font-bold">
        <a href={payHref} onClick={gatePay} target="_blank" rel="noopener noreferrer">
          <IconBrandWhatsapp className="size-5" />
          {t('pay', { total })}
        </a>
      </Button>
      <span className="text-muted-foreground -mt-2 text-center text-xs">{tUpgrade('payNote')}</span>
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
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {body}
      </DialogContent>
    </Dialog>
  );
});

/** "Add records" with its own Top-up sheet, for a page that hosts no other trigger. */
export function TopUpButton({
  view,
  plan,
  eventName,
  className,
  variant,
}: Omit<TopUpSheetProps, 'open' | 'onOpenChange'> &
  Pick<React.ComponentProps<typeof Button>, 'className' | 'variant'>) {
  const t = useTranslations('billing.packageSheet');
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={() => setOpen(true)}>
        <IconPlus />
        {t('addRecords')}
      </Button>
      <TopUpSheet open={open} onOpenChange={setOpen} view={view} plan={plan} eventName={eventName} />
    </>
  );
}

function Row({
  label,
  value,
  strong,
  className,
}: {
  label: string;
  value: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex min-h-10 items-center justify-between gap-3', className)}>
      <span className={cn('text-[14.5px]', strong ? 'font-bold' : 'font-medium')}>{label}</span>
      <span
        className={cn('text-[15.5px] tabular-nums', strong ? 'font-extrabold' : 'font-semibold')}
      >
        {value}
      </span>
    </div>
  );
}
