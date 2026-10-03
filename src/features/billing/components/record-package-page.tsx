'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconGift,
  IconPackage,
  IconReceipt,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { useFeatureHeader } from '@/components/feature-layout';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { billingWhatsAppUrl } from '../utils';
import type { RecordPackagePageView } from '../types';
import { PackageBar, PackageSwatch } from './package-bar';
import { PackageHeroCount, usePackageWhatsAppHref } from './package-hero';

type RecordPackagePageProps = {
  eventId: string;
  eventName?: string;
  /** Null when the event has no package yet: free, or a payment still pending. */
  view: RecordPackagePageView | null;
};

function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('bg-card rounded-[18px] border', className)}>
      {children}
    </div>
  );
}

/**
 * The Owner's Record Package page (Record Package Plan design, 1a-1h): how much room is left
 * or how far over the list is, what the package is made of, and every payment behind it. A
 * receipt and a fuel gauge - tabular numbers, a quiet bar, colour only when there is
 * something to do. Buying records is a WhatsApp conversation with Kululu, never a checkout.
 */
export function RecordPackagePage({
  eventId,
  eventName,
  view,
}: RecordPackagePageProps) {
  const t = useTranslations('billing.packagePage');

  useFeatureHeader({ title: t('title'), subtitle: t('subtitle') });

  return view ? (
    <PackageDetails eventId={eventId} eventName={eventName} view={view} />
  ) : (
    <NoPackage eventName={eventName} />
  );
}

function NoPackage({ eventName }: { eventName?: string }) {
  const t = useTranslations('billing.packagePage');
  const tPlan = useTranslations('billing.sheet');

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
        <IconPackage size={24} stroke={1.9} />
      </span>
      <p className="text-lg font-bold">{t('empty.title')}</p>
      <p className="text-muted-foreground text-sm text-pretty">
        {t('empty.description')}
      </p>
      <Button asChild className="mt-2">
        <a
          href={billingWhatsAppUrl(
            t('empty.whatsapp', { event: eventName ?? '' }),
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconBrandWhatsapp />
          {tPlan('cta.talk')}
        </a>
      </Button>
    </div>
  );
}

function PackageDetails({
  eventId,
  eventName,
  view,
}: {
  eventId: string;
  eventName?: string;
  view: RecordPackagePageView;
}) {
  const t = useTranslations('billing.packagePage');
  const tSheet = useTranslations('billing.packageSheet');
  const locale = useLocale();
  const whatsappHref = usePackageWhatsAppHref(view, eventName);

  const fmt = (n: number) => n.toLocaleString(locale);
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  const moneyFormat = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });

  const over = view.state === 'over';
  const channel = view.channel ? tSheet(`channels.${view.channel}`) : null;

  const legend = [
    {
      kind: 'paid' as const,
      label: view.gifted ? t('legend.gifted') : t('legend.paid'),
      value: view.paid,
    },
    ...(view.bonus
      ? [
          {
            kind: 'bonus' as const,
            label: t('legend.bonus'),
            value: view.bonus,
          },
        ]
      : []),
    ...(view.over
      ? [{ kind: 'over' as const, label: t('legend.over'), value: view.over }]
      : []),
  ];

  const breakdown: {
    key: string;
    label: string;
    value: number;
    bonus?: boolean;
    total?: boolean;
    warn?: boolean;
  }[] = [
    {
      key: 'paid',
      label: view.gifted ? tSheet('giftedRecords') : tSheet('paidRecords'),
      value: view.paid,
    },
    { key: 'bonus', label: t('rows.bonus'), value: view.bonus, bonus: true },
    { key: 'total', label: tSheet('total'), value: view.size, total: true },
    { key: 'used', label: t('rows.used'), value: view.used },
    over
      ? { key: 'over', label: t('rows.over'), value: view.over, warn: true }
      : { key: 'left', label: t('rows.left'), value: view.left },
  ];

  const addRecords = (
    <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
      <IconBrandWhatsapp />
      {tSheet('addRecords')}
    </a>
  );

  // The oldest payment opened the package; the list is newest first.
  const firstPaymentId = view.payments.at(-1)?.id;

  return (
    <div className="grid w-full grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <Card className="flex flex-col gap-3.5 p-[18px]">
          <div className="flex items-center justify-between gap-2.5">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[13.5px] font-semibold">
              <IconPackage size={16} stroke={2} />
              {t('cardTitle')}
            </span>
            {channel && (
              <span className="bg-muted flex h-[26px] items-center rounded-full px-2.5 text-[12.5px] font-semibold">
                {channel}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <PackageHeroCount
              view={view}
              numberClassName="text-5xl tracking-[-0.02em]"
            />
            <span className="text-muted-foreground text-[13px] tabular-nums">
              {tSheet('usedOf', { used: fmt(view.used), size: fmt(view.size) })}
            </span>
          </div>

          <PackageBar view={view} className="h-3 gap-0.5" />

          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {legend.map((item) => (
              <span
                key={item.kind}
                className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]"
              >
                <PackageSwatch kind={item.kind} />
                {item.label}
                <b className="text-foreground tabular-nums">
                  {fmt(item.value)}
                </b>
              </span>
            ))}
          </div>

          {!over && (
            <Button
              asChild
              variant="outline"
              className="text-primary h-11 rounded-xl font-bold"
            >
              {addRecords}
            </Button>
          )}
        </Card>

        {over && (
          <div className="bg-warning-tint flex flex-col gap-3 rounded-[18px] p-4">
            <div className="text-warning-strong flex items-center gap-2">
              <IconAlertTriangle size={19} stroke={2} className="shrink-0" />
              <span className="text-base font-extrabold">
                {t('over.title', { count: view.over })}
              </span>
            </div>
            <p className="text-foreground text-[13.5px] leading-[1.55] text-pretty">
              {t('over.body')}
            </p>
            <div className="flex items-center gap-3.5">
              <Button asChild className="h-[46px] flex-1 rounded-xl font-bold">
                {addRecords}
              </Button>
              <Link
                href={`/app/${eventId}/guests?package=outside`}
                className="text-warning-strong text-sm font-bold whitespace-nowrap underline underline-offset-[3px]"
              >
                {tSheet('showOutside')}
              </Link>
            </div>
          </div>
        )}

        <Card className="px-4 py-1">
          {breakdown.map((row, index) => (
            <div
              key={row.key}
              className={cn(
                'flex min-h-12 items-center gap-2 text-sm',
                index > 0 && 'border-t',
                row.total && 'border-foreground/15',
              )}
            >
              {row.bonus && (
                <IconGift
                  size={16}
                  stroke={2}
                  className="text-violet-strong shrink-0"
                />
              )}
              <span
                className={cn(
                  'min-w-0 flex-1',
                  row.total || row.warn ? 'font-bold' : 'font-medium',
                  row.warn && 'text-warning-strong',
                )}
              >
                {row.label}
              </span>
              {row.bonus && view.bonusIsCustom && (
                <span className="bg-violet-tint text-violet-strong inline-flex h-[22px] items-center rounded-full px-2 text-[11.5px] font-bold whitespace-nowrap">
                  {t('rows.customBonus')}
                </span>
              )}
              <span
                className={cn(
                  'tabular-nums',
                  row.total || row.warn ? 'font-extrabold' : 'font-semibold',
                  row.warn && 'text-warning-strong',
                )}
              >
                {fmt(row.value)}
              </span>
            </div>
          ))}
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-3.5">
        <Card className="flex flex-col px-4 pt-3.5 pb-1.5">
          <span className="pb-1.5 text-[15px] font-extrabold">
            {t('payments.title')}
          </span>
          {view.payments.map((payment, index) => {
            const Icon = payment.gift ? IconGift : IconReceipt;
            return (
              <div
                key={payment.id}
                className={cn(
                  'flex items-center gap-3 py-2.5',
                  index > 0 && 'border-t',
                )}
              >
                <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-[10px]">
                  <Icon size={17} stroke={2} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-[7px]">
                    <span className="text-sm font-bold tabular-nums">
                      {t('payments.records', {
                        count: payment.records,
                        formatted: fmt(payment.records),
                      })}
                    </span>
                    {payment.id === firstPaymentId && (
                      <span className="bg-muted text-muted-foreground inline-flex h-5 items-center rounded-md px-[7px] text-[11px] font-bold">
                        {t('payments.first')}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-[12.5px]">
                    {dateFormat.format(new Date(payment.occurredAt))} ·{' '}
                    {tSheet(`channels.${payment.channel}`)}
                  </span>
                </div>
                <span className="text-sm font-bold whitespace-nowrap tabular-nums">
                  {payment.gift
                    ? t('payments.gift')
                    : moneyFormat.format(payment.amount)}
                </span>
              </div>
            );
          })}
        </Card>

        <div className="flex flex-col gap-2 px-1.5 py-1">
          <span className="text-muted-foreground text-[13.5px] font-bold">
            {t('help.title')}
          </span>
          {(['unlimited', 'oldestFirst', 'reachedStays'] as const).map(
            (key) => (
              <div
                key={key}
                className="text-muted-foreground flex gap-2 text-[13px] leading-normal"
              >
                <span className="bg-muted-foreground/60 mt-2 size-[5px] shrink-0 rounded-full" />
                {t(`help.${key}`)}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
