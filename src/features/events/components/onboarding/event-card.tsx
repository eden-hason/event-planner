'use client';

import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/**
 * The card the couple watches take shape.
 *
 * It gains a line with every answer - the names, then the date, then the venue -
 * and by the payoff it is complete. It is the spine of the whole flow, and the
 * same card becomes the dashboard's hero afterwards, which is why it is built to
 * live on a dashboard forever rather than as a one-off onboarding flourish.
 *
 * Every field is optional and rendered independently: the couple can leave and
 * return at any stage, and the dateless and venueless paths are permanent for
 * some events.
 */

export type EventCardData = {
  eventType?: string;
  /** Generated from the names; absent until the names screen is answered. */
  title?: string;
  /** ISO date, or null both before the date screen and after "no date yet". */
  eventDate?: string | null;
  /** True once the couple has said they have no date - a state, not a gap. */
  noDate?: boolean;
  venue?: string;
};

/**
 * `strip` sits above the question on mobile, `full` beside it on desktop,
 * `hero` is the payoff, and `dash` is the dashboard hero it becomes.
 */
export type EventCardSize = 'strip' | 'full' | 'hero' | 'dash';

const DIMS: Record<
  EventCardSize,
  {
    pad: string;
    gap: string;
    radius: string;
    title: string;
    eyebrow: string;
    chip: string;
    illu: string;
    wash: string;
  }
> = {
  strip: {
    pad: 'p-[14px_16px]',
    // Roomier than the strip's compactness suggests: at this height the chips
    // sit directly under the title, and a tight gap reads as one crowded block.
    gap: 'gap-4',
    radius: 'rounded-[18px]',
    title: 'text-[17px]',
    eyebrow: 'text-[11px]',
    chip: 'text-[11.5px]',
    illu: 'h-11',
    wash: 'h-[76px]',
  },
  full: {
    pad: 'p-5',
    gap: 'gap-3',
    radius: 'rounded-3xl',
    title: 'text-[20px]',
    eyebrow: 'text-[12px]',
    chip: 'text-[12.5px]',
    illu: 'h-16',
    wash: 'h-[104px]',
  },
  hero: {
    pad: 'p-[26px_22px]',
    gap: 'gap-3.5',
    radius: 'rounded-[28px]',
    title: 'text-2xl',
    eyebrow: 'text-[13px]',
    chip: 'text-[13px]',
    illu: 'h-21',
    wash: 'h-[132px]',
  },
  dash: {
    pad: 'p-[18px]',
    gap: 'gap-2.5',
    radius: 'rounded-[14px]',
    title: 'text-[18px]',
    eyebrow: 'text-[11px]',
    chip: 'text-[12px]',
    illu: 'h-14',
    wash: 'h-[92px]',
  },
};

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--kt-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--kt-violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.6 5.6 1.4-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
    </svg>
  );
}

/** Whole days from today to the event, floored at zero. */
function daysUntil(eventDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(eventDate);
  target.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.round((target.getTime() - today.getTime()) / 86_400_000),
  );
}

const CHIP_BASE =
  'inline-flex items-center gap-[7px] rounded-full px-3 py-[7px] font-medium backdrop-blur-[4px]';

export function EventCard({
  data,
  size = 'strip',
  className,
}: {
  data: EventCardData;
  size?: EventCardSize;
  className?: string;
}) {
  const t = useTranslations('onboarding.card');
  const locale = useLocale();
  const d = DIMS[size];
  // hero and full are the big presentations: they give the countdown its own
  // line instead of a chip, because at that size a chip reads as an afterthought.
  const big = size === 'hero' || size === 'full';

  const hasDate = !!data.eventDate;
  const dateText = data.eventDate
    ? new Date(data.eventDate).toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;
  const days = data.eventDate ? daysUntil(data.eventDate) : null;

  const typeLabel = data.eventType
    ? t(`typeLabel.${data.eventType}` as 'typeLabel.wedding')
    : t('typeFallback');
  const illustration =
    data.eventType === 'bar_mitzva' || data.eventType === 'bat_mitzva'
      ? '/hero-mitzva.svg'
      : '/hero-wedding.svg';

  const hasChips = hasDate || data.noDate || !!data.venue;

  return (
    <div
      dir="rtl"
      className={cn(
        'relative flex flex-col overflow-hidden border border-[var(--kt-border-soft)] bg-[var(--kt-card)] text-[var(--kt-ink)] shadow-[0_8px_24px_rgba(26,11,46,0.06),0_2px_6px_rgba(26,11,46,0.04)]',
        d.pad,
        d.gap,
        d.radius,
        className,
      )}
    >
      {/* Brand wash bleeding down from the top edge, masked so it dissolves
          rather than ending on a hard line. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 opacity-75',
          d.wash,
        )}
        style={{
          background:
            'linear-gradient(135deg,#FFE7F8 0%,#F1E8FF 45%,#FFE6DC 100%)',
          WebkitMaskImage: 'linear-gradient(180deg,#000 55%,transparent 100%)',
          maskImage: 'linear-gradient(180deg,#000 55%,transparent 100%)',
        }}
      />

      <div className="relative flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div
            className={cn(
              'font-semibold tracking-[0.02em] text-[var(--kt-brand-deep)]',
              d.eyebrow,
            )}
          >
            {typeLabel}
          </div>
          {data.title ? (
            <div
              className={cn(
                'animate-[kt-line-in_0.45s_cubic-bezier(0.16,1,0.3,1)_both] truncate leading-[1.2] font-extrabold tracking-[-0.01em]',
                d.title,
              )}
            >
              {data.title}
            </div>
          ) : (
            <div className={cn('font-bold text-[#C9BCD9]', d.title)}>
              {t('untitled')}
            </div>
          )}
        </div>
        {/* Hidden on the strip once there is a title: at that height the
            illustration and the names compete for the same line. */}
        {(size !== 'strip' || !data.title) && (
          <img
            src={illustration}
            alt=""
            aria-hidden="true"
            className={cn('relative w-auto shrink-0 select-none', d.illu)}
          />
        )}
      </div>

      {hasChips && (
        <div className="relative flex flex-wrap gap-2">
          {hasDate && (
            <div
              className={cn(
                CHIP_BASE,
                'animate-[kt-line-in_0.45s_cubic-bezier(0.16,1,0.3,1)_both] border border-[rgba(26,11,46,0.09)] bg-white/75 text-[var(--kt-ink-muted)]',
                d.chip,
              )}
            >
              <CalendarIcon />
              <span>{dateText}</span>
            </div>
          )}
          {hasDate && days !== null && !big && (
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-[var(--kt-violet-soft)] to-[var(--kt-brand)] px-3 py-[7px] font-bold text-white shadow-[0_4px_12px_rgba(210,60,194,0.25)]',
                d.chip,
              )}
            >
              {t('daysToGo', { days })}
            </div>
          )}
          {data.noDate && !big && (
            <div
              className={cn(
                CHIP_BASE,
                'border border-dashed border-[rgba(127,90,240,0.35)] bg-[rgba(167,139,250,0.1)] font-semibold text-[var(--kt-violet)]',
                d.chip,
              )}
            >
              <SparkIcon />
              <span>{t('noDateChip')}</span>
            </div>
          )}
          {data.venue && (
            <div
              className={cn(
                CHIP_BASE,
                'max-w-full border border-[rgba(26,11,46,0.09)] bg-white/75 text-[var(--kt-ink-muted)]',
                d.chip,
              )}
            >
              <PinIcon />
              <span className="truncate">{data.venue}</span>
            </div>
          )}
        </div>
      )}

      {big && hasDate && days !== null && (
        <div className="relative flex items-baseline justify-center gap-2 pt-2 pb-1">
          <span
            dir="ltr"
            className="bg-gradient-to-l from-[var(--kt-violet-soft)] to-[var(--kt-brand)] bg-clip-text font-[family-name:var(--font-rubik)] text-[44px] font-extrabold tracking-[-0.03em] text-transparent"
          >
            {days}
          </span>
          <span className="text-[15px] font-semibold text-[var(--kt-ink-muted)]">
            {t('daysToEvent')}
          </span>
        </div>
      )}

      {/* The dateless payoff. It has to look deliberate rather than broken:
          this is a legitimate destination, not a question left unanswered. */}
      {big && data.noDate && (
        <div className="relative pt-2.5 pb-1 text-center">
          <div className="text-base font-bold text-[var(--kt-violet)]">
            {t('noDateTitle')}
          </div>
          <div className="mt-0.5 text-[12.5px] text-[var(--kt-ink-faint)]">
            {t('noDateDescription')}
          </div>
        </div>
      )}
    </div>
  );
}
