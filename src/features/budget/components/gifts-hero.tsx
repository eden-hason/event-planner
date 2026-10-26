'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconArrowUp, IconChartBar, IconChevronDown } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../types';
import type { GiftSegment, GiftSummary } from '../utils/gift-summary';
import { PAYMENT_METHOD_FILL } from './payment-method-styles';

interface GiftsHeroProps {
  summary: GiftSummary;
  /** Confirmed guests, for the empty state's "N guests confirmed" line. */
  confirmedGuestCount: number;
  onAddGift: () => void;
}

/**
 * The Gifts tab's hero: how much has come in, and how far along the log is.
 * Everything here is derived from the rows already on the page - no fetch of
 * its own. Unlike the sibling heroes it stays below `md`, where it is the
 * main view and the table becomes a list under it, so it renders twice and
 * lets the breakpoint pick.
 */
export function GiftsHero(props: GiftsHeroProps) {
  return (
    <>
      <DesktopHero {...props} />
      <MobileHero {...props} />
    </>
  );
}

function useSegmentLabel() {
  const t = useTranslations('budget');
  return (segment: GiftSegment) =>
    segment.key === 'none' ? t('giftsHero.noMethod') : t(`paymentMethods.${segment.key}`);
}

function Progress({ summary, size }: { summary: GiftSummary; size: 'lg' | 'sm' }) {
  const t = useTranslations('budget.giftsHero');
  const textSize = size === 'lg' ? 'text-sm' : 'text-[13px]';

  return (
    <div className={cn('flex flex-col', size === 'lg' ? 'gap-2' : 'gap-1.5')}>
      <div className="flex items-center gap-2.5">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.progressPercent}
          aria-label={t('progressAria')}
          className="bg-primary/20 h-2 flex-1 overflow-hidden rounded-full"
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-700',
              summary.isComplete ? 'bg-success' : 'bg-primary',
            )}
            style={{ width: `${summary.progressPercent}%` }}
          />
        </div>
        <span className={cn(textSize, 'font-bold tabular-nums')}>{summary.progressPercent}%</span>
      </div>
      <span className={cn(textSize, 'text-muted-foreground')}>
        {summary.isComplete
          ? t('progressComplete', { total: summary.rowCount })
          : t('progress', { logged: summary.loggedCount, total: summary.rowCount })}
      </span>
    </div>
  );
}

function SplitBar({ segments, className }: { segments: GiftSegment[]; className: string }) {
  return (
    <div aria-hidden className={cn('flex overflow-hidden rounded-full', className)}>
      {segments.map((segment) => (
        <span
          key={segment.key}
          className={cn('min-w-1.5', PAYMENT_METHOD_FILL[segment.key])}
          style={{ flex: segment.amount }}
        />
      ))}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card flex min-w-0 flex-col gap-2 rounded-[14px] p-3">
      <span className="flex items-center gap-2">
        <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
          {icon}
        </span>
        <span className="text-muted-foreground truncate text-sm font-semibold">{label}</span>
      </span>
      <span
        dir="ltr"
        className="self-start text-2xl font-extrabold tracking-[-0.02em] whitespace-nowrap tabular-nums"
      >
        {value}
      </span>
    </div>
  );
}

function DesktopHero({ summary, confirmedGuestCount, onAddGift }: GiftsHeroProps) {
  const t = useTranslations('budget.giftsHero');
  const segmentLabel = useSegmentLabel();
  const hasData = summary.loggedCount > 0;

  return (
    <section
      aria-label={t('label')}
      className="bg-primary/10 hidden gap-8 rounded-3xl p-7 md:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
    >
      {hasData ? (
        <>
          <div className="flex min-w-0 flex-col justify-center gap-3.5">
            <span className="text-primary text-sm font-semibold">{t('label')}</span>
            <span
              dir="ltr"
              className="self-start text-[56px] leading-none font-extrabold tracking-[-0.03em] tabular-nums"
            >
              {formatCurrency(summary.total)}
            </span>
            <div className="mt-1">
              <Progress summary={summary} size="lg" />
            </div>
            <div className="mt-0.5 grid grid-cols-2 gap-2">
              <StatCard
                icon={<IconChartBar size={16} stroke={1.8} />}
                label={t('average')}
                value={formatCurrency(summary.average)}
              />
              <StatCard
                icon={<IconArrowUp size={16} stroke={1.8} />}
                label={t('largest')}
                value={formatCurrency(summary.largest)}
              />
            </div>
          </div>

          <div className="bg-card flex min-w-0 flex-col gap-4 rounded-[18px] border p-5">
            <span className="text-[15px] font-bold">{t('byMethod')}</span>
            <SplitBar segments={summary.segments} className="h-3.5" />
            <div className="grid grid-cols-3 gap-x-5 gap-y-3.5">
              {summary.segments.map((segment) => (
                <div key={segment.key} className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-muted-foreground flex items-center gap-[7px] text-[13px]">
                    <span
                      className={cn('size-[9px] shrink-0 rounded-full', PAYMENT_METHOD_FILL[segment.key])}
                    />
                    <span className="truncate">{segmentLabel(segment)}</span>
                  </span>
                  <span
                    dir="ltr"
                    className="self-start text-lg font-bold tabular-nums"
                  >
                    {formatCurrency(segment.amount)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t('segmentMeta', { count: segment.count, percent: segment.percent })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-col items-start justify-center gap-3">
            <span className="text-primary text-sm font-semibold">{t('emptyLabel')}</span>
            <h2 className="text-[32px] leading-[1.15] font-extrabold tracking-[-0.02em] text-balance">
              {t('emptyTitle')}
            </h2>
            <p className="text-muted-foreground text-[15px] leading-normal text-pretty">
              {t('emptyBody', { count: confirmedGuestCount })}
            </p>
            <Button size="lg" onClick={onAddGift} className="mt-1 h-11 rounded-xl px-5 text-[15px]">
              {t('emptyCta')}
            </Button>
          </div>

          <div className="bg-card border-primary/30 flex min-w-0 flex-col justify-center gap-4 rounded-[18px] border border-dashed p-5">
            <span className="text-[15px] font-bold">{t('byMethod')}</span>
            <div className="bg-primary/20 h-3.5 rounded-full" />
            <span className="text-muted-foreground text-sm">{t('emptyMethodHint')}</span>
          </div>
        </>
      )}
    </section>
  );
}

function MobileHero({ summary, confirmedGuestCount, onAddGift }: GiftsHeroProps) {
  const t = useTranslations('budget.giftsHero');
  const segmentLabel = useSegmentLabel();
  const [open, setOpen] = useState(false);
  const hasData = summary.loggedCount > 0;

  return (
    <section
      aria-label={t('label')}
      className="bg-primary/10 flex flex-col gap-3.5 rounded-[20px] p-[18px] md:hidden"
    >
      {hasData ? (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-primary text-[13px] font-semibold">{t('label')}</span>
            <span
              dir="ltr"
              className="self-start text-[40px] leading-[1.05] font-extrabold tracking-[-0.03em] tabular-nums"
            >
              {formatCurrency(summary.total)}
            </span>
          </div>
          <Progress summary={summary} size="sm" />

          <div className="bg-card flex flex-col rounded-[14px]">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="flex h-12 items-center justify-between gap-2 px-3.5 text-sm font-bold"
            >
              <span>{t('byMethod')}</span>
              <span className="text-primary flex items-center gap-1.5 text-[13px] font-semibold">
                {open ? t('hide') : t('show')}
                <IconChevronDown
                  size={14}
                  stroke={1.8}
                  className={cn('transition-transform duration-200', open && 'rotate-180')}
                />
              </span>
            </button>
            {open && (
              <div className="flex flex-col gap-3 px-3.5 pb-3.5">
                <SplitBar segments={summary.segments} className="h-2.5" />
                <div className="flex flex-col">
                  {summary.segments.map((segment) => (
                    <div key={segment.key} className="flex items-center gap-2 border-t py-2">
                      <span
                        className={cn('size-2 shrink-0 rounded-full', PAYMENT_METHOD_FILL[segment.key])}
                      />
                      <span className="text-muted-foreground flex-1 truncate text-sm">
                        {segmentLabel(segment)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {t('segmentMeta', { count: segment.count, percent: segment.percent })}
                      </span>
                      <span className="w-[84px] text-end text-[15px] font-bold tabular-nums">
                        {formatCurrency(segment.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <span className="text-primary text-[13px] font-semibold">{t('emptyLabel')}</span>
          <h2 className="text-2xl leading-[1.2] font-extrabold">{t('emptyTitle')}</h2>
          <p className="text-muted-foreground text-sm leading-normal">
            {t('emptyBody', { count: confirmedGuestCount })}
          </p>
          <Button onClick={onAddGift} className="h-12 rounded-xl text-[15px]">
            {t('emptyCta')}
          </Button>
        </>
      )}
    </section>
  );
}
