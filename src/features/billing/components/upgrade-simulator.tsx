'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, Phone } from 'lucide-react';
import {
  IconBrandWhatsapp,
  IconCheck,
  IconGift,
  IconPlus,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { useHideBottomNav } from '@/components/layout/bottom-nav-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useSaveGatedClick } from '@/features/auth';
import {
  BONUS_STEPS,
  GIFT_TRACK_END,
  PRICING_CHANNELS,
  RECORD_PACKAGE_RATES,
  RECORDS_MAX,
  RECORDS_MIN,
  RECORDS_STEP,
  billingWhatsAppUrl,
  clampRecords,
  formatShekels,
  nextBonusStep,
  quote,
  trackPct,
  type PricingChannel,
} from '../utils';

type LineKey =
  | 'invitation'
  | 'confirmations'
  | 'reminder'
  | 'thankYou'
  | 'callRounds'
  | 'callResults';

type PlanStyle = {
  /** Icon tile and check tint, ink, and the softer wash behind its "what's included". */
  tint: string;
  ink: string;
  soft: string;
  icon: React.ReactNode;
  /** The Plan this one builds on: its lines are included too. */
  base?: PricingChannel;
  /** What this Plan includes (ADR 0034) on top of its base. */
  lines: LineKey[];
};

const PLANS: Record<PricingChannel, PlanStyle> = {
  whatsapp: {
    tint: 'bg-success/15',
    ink: 'text-success',
    soft: 'bg-success/10',
    icon: <IconBrandWhatsapp />,
    lines: ['invitation', 'confirmations', 'reminder', 'thankYou'],
  },
  whatsapp_calls: {
    tint: 'bg-violet-tint',
    ink: 'text-violet-strong',
    soft: 'bg-violet-tint/60',
    icon: <Phone />,
    base: 'whatsapp',
    lines: ['callRounds', 'callResults'],
  },
};

type Line = { key: LineKey; owner: PricingChannel };

/** A Plan's lines with its base's first, each tagged with the Plan that owns it. */
function linesOf(id: PricingChannel): Line[] {
  const plan = PLANS[id];
  return [
    ...(plan.base ? linesOf(plan.base) : []),
    ...plan.lines.map((key) => ({ key, owner: id })),
  ];
}

/** Every line any Plan includes: the lists keep them all and fold away the rest. */
const ALL_LINES = PRICING_CHANNELS.flatMap((id) =>
  PLANS[id].lines.map((key) => ({ key, owner: id })),
);

const TICKS = [50, 250, 500, 750, 1000];

/** Centres a label on its point, or pins it inside the track at either end. */
const tickShift = (i: number, last: number) =>
  i === 0
    ? ''
    : i === last
      ? '-translate-x-full rtl:translate-x-full'
      : '-translate-x-1/2 rtl:translate-x-1/2';

/**
 * The upgrade from the free plan (Upgrade Button design, ADR 0034): choose a Plan and how
 * many records, see the price and the gift, and check out. Checkout is a WhatsApp
 * conversation with Kululu, pre-filled with the quote. On desktop the summary sits beside
 * the choices; on a phone it is a bar pinned to the bottom edge, in place of the bottom nav.
 */
export function UpgradeSimulator({ eventName }: { eventName?: string }) {
  const t = useTranslations('billing.upgrade');
  const locale = useLocale();
  const isMobile = useIsMobile();
  const gatePay = useSaveGatedClick('pay');
  const [channel, setChannel] = React.useState<PricingChannel>('whatsapp');
  const [records, setRecords] = React.useState(150);
  const [includesOpen, setIncludesOpen] = React.useState(false);

  useHideBottomNav(isMobile);

  const fmt = (n: number) => n.toLocaleString(locale);
  const money = (n: number) => formatShekels(n, locale);

  const { total, bonus, packageSize } = quote(records, channel);
  // While the bonus line folds away it keeps showing the first step, never "+0"
  const shownBonus = bonus || BONUS_STEPS[0].records;
  const rate = money(RECORD_PACKAGE_RATES[channel]);
  const planName = t(`plans.${channel}.name`);
  const lines = linesOf(channel);
  const shown = new Set(lines.map((line) => line.key));

  const payHref = billingWhatsAppUrl(
    t('whatsApp', {
      event: eventName ?? '',
      plan: planName,
      records: fmt(records),
      total: money(total),
    }),
  );

  const step = (delta: number) => setRecords(clampRecords(records + delta));

  const payButton = (label: string) => (
    <Button asChild size="lg" className="h-[52px] rounded-[14px] text-base font-bold">
      <a href={payHref} onClick={gatePay} target="_blank" rel="noopener noreferrer">
        <IconBrandWhatsapp className="size-5" />
        {label}
      </a>
    </Button>
  );

  const lineRow = ({ key, owner }: Line) => (
    <div className="flex items-start gap-2.5 pt-2.5">
      <span
        className={cn(
          'mt-px flex size-5 shrink-0 items-center justify-center rounded-full',
          PLANS[owner].tint,
          PLANS[owner].ink,
        )}
        aria-hidden
      >
        {/* A Plan's own lines get a check; what it adds on top of its base gets a plus */}
        {PLANS[owner].base ? <IconPlus size={11} stroke={3} /> : <IconCheck size={11} stroke={3} />}
      </span>
      <span className="flex flex-col gap-px">
        <span className="text-sm leading-snug font-semibold">{t(`lines.${key}.t`)}</span>
        <span className="text-muted-foreground text-xs leading-snug">{t(`lines.${key}.s`)}</span>
      </span>
    </div>
  );

  // Rows fold open and shut rather than appear, so switching Plans grows the list smoothly
  const includedLines = ALL_LINES.map((line) => (
    <Reveal key={line.key} open={shown.has(line.key)}>
      {lineRow(line)}
    </Reveal>
  ));

  return (
    <div className="flex flex-col gap-4 pb-36 md:grid md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-6 md:pb-0">
      <div className="bg-card flex flex-col gap-6 rounded-[18px] border p-4 md:gap-7 md:p-6">
        <section className="flex flex-col gap-2.5 md:gap-3">
          <StepHead n={1} title={t('planStep')} />
          <div role="radiogroup" aria-label={t('planGroup')} className="grid grid-cols-2 gap-2 md:gap-2.5">
            {PRICING_CHANNELS.map((id) => {
              const on = id === channel;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setChannel(id)}
                  className={cn(
                    'flex min-h-[60px] flex-col gap-2 rounded-[14px] border-2 p-3 text-start transition-colors md:px-4 md:py-3.5',
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                    on ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-[10px] md:size-[34px] [&_svg]:size-4 md:[&_svg]:size-[17px]',
                        PLANS[id].tint,
                        PLANS[id].ink,
                      )}
                    >
                      {PLANS[id].icon}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-px md:flex-row md:items-center md:justify-between md:gap-2">
                      <span className="text-[13.5px] leading-tight font-bold md:text-[15px]">
                        {t(`plans.${id}.name`)}
                      </span>
                      <span className="text-muted-foreground text-xs md:text-[13px]">
                        <b className="text-foreground text-[15px] font-extrabold md:text-lg">
                          {money(RECORD_PACKAGE_RATES[id])}
                        </b>{' '}
                        {t('perRecord')}
                      </span>
                    </span>
                  </span>
                  <span className="text-muted-foreground hidden text-[13px] leading-snug md:block">
                    {t(`plans.${id}.desc`)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Phones keep the tiles short, so what the chosen Plan includes folds out beneath them */}
          <div className={cn('rounded-[14px] md:hidden', PLANS[channel].soft)}>
            <button
              type="button"
              aria-expanded={includesOpen}
              onClick={() => setIncludesOpen((open) => !open)}
              className={cn(
                'flex min-h-11 w-full items-center gap-2 px-3.5 py-2.5 text-start text-[13px] font-bold',
                PLANS[channel].ink,
              )}
            >
              <span className="flex-1">{t('includesIn', { plan: planName })}</span>
              <span className="text-muted-foreground text-xs font-semibold">
                {t('itemCount', { count: lines.length })}
              </span>
              <ChevronDown
                className={cn('size-4 transition-transform', includesOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
            <Reveal open={includesOpen}>
              <div className="flex flex-col px-3.5 pb-3.5">
                <p className="text-muted-foreground text-[12.5px] leading-snug">
                  {t(`plans.${channel}.desc`)}
                </p>
                {includedLines}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StepHead n={2} title={t('recordsStep')} hint={t('recordsHint')} htmlFor="upgrade-records" />
            <div className="flex w-full items-center gap-2 md:w-auto">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 rounded-xl text-xl md:size-10"
                onClick={() => step(-RECORDS_STEP)}
                aria-label={t('fewer', { step: RECORDS_STEP })}
              >
                −
              </Button>
              <div className="bg-muted flex-1 rounded-xl px-3 py-1.5 text-center md:min-w-28 md:flex-none">
                <span className="text-[22px] font-extrabold tabular-nums md:text-2xl">{fmt(records)}</span>
                <span className="text-muted-foreground ms-1 text-[13px]">{t('records')}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 rounded-xl text-xl md:size-10"
                onClick={() => step(RECORDS_STEP)}
                aria-label={t('more', { step: RECORDS_STEP })}
              >
                +
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 py-1">
            <input
              id="upgrade-records"
              type="range"
              min={RECORDS_MIN}
              max={RECORDS_MAX}
              step={RECORDS_STEP}
              value={records}
              onChange={(e) => setRecords(clampRecords(Number(e.target.value)))}
              aria-valuetext={t('recordsValue', { count: fmt(records) })}
              className="accent-primary h-2 w-full cursor-pointer"
            />
            <div className="text-muted-foreground relative h-[18px] text-xs" aria-hidden>
              {TICKS.map((v, i) => (
                <span
                  key={v}
                  className={cn('absolute top-0', tickShift(i, TICKS.length - 1))}
                  style={{ insetInlineStart: `${trackPct(v, RECORDS_MAX)}%` }}
                >
                  {fmt(v)}
                </span>
              ))}
            </div>
          </div>

          <GiftTimeline records={records} bonus={bonus} />
        </section>
      </div>

      {/* Desktop: the summary beside the choices, pinned as the page scrolls */}
      <aside
        aria-live="polite"
        className="bg-card sticky top-[calc(var(--page-header-h,0px)+1rem)] hidden flex-col gap-4.5 rounded-[18px] border p-6 md:flex"
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-sm font-semibold">{t('summary')}</span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[13px] font-semibold transition-colors',
                PLANS[channel].tint,
                PLANS[channel].ink,
              )}
            >
              {planName}
            </span>
            <span className="text-muted-foreground text-[13px]">
              {rate} {t('perRecord')}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-5xl leading-none font-extrabold tracking-tight tabular-nums">{money(total)}</span>
          <span className="text-muted-foreground text-[13px]">{t('oneTime')}</span>
        </div>

        <div className="flex flex-col border-t pt-1.5">
          <span className="text-muted-foreground pt-2 text-sm font-semibold">{t('includes')}</span>
          {includedLines}
        </div>

        <div className="flex flex-col border-y py-4 text-sm">
          <SummaryRow label={t('lineRecords', { count: fmt(records), rate })} value={money(total)} />
          <Reveal open={bonus > 0}>
            <div className="pt-2.5">
              <SummaryRow
                label={t('lineBonus', { count: fmt(shownBonus) })}
                value={<span className="text-success font-bold">{t('free')}</span>}
              />
            </div>
          </Reveal>
          <div className="pt-2.5">
            <SummaryRow strong label={t('totalRecords')} value={fmt(packageSize)} />
          </div>
        </div>

        {payButton(`${t('pay')} · ${money(total)}`)}
        <span className="text-muted-foreground -mt-2 text-center text-xs">{t('payNote')}</span>
      </aside>

      {/* Phone: the summary and checkout pinned to the bottom edge */}
      <div
        aria-live="polite"
        className="bg-card fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2.5 border-t px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(26,11,46,0.08)] md:hidden"
      >
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-[13px]">
              {t('footerRecords', { count: fmt(packageSize), plan: planName })}
            </span>
            {bonus > 0 && (
              <span className="text-success animate-in fade-in text-xs font-bold">
                {t('footerBonus', { count: fmt(bonus) })}
              </span>
            )}
          </div>
          <span className="text-3xl leading-none font-extrabold tracking-tight tabular-nums">{money(total)}</span>
        </div>
        {payButton(t('pay'))}
      </div>
    </div>
  );
}

function StepHead({
  n,
  title,
  hint,
  htmlFor,
}: {
  n: number;
  title: string;
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="bg-foreground text-background flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold md:size-[26px] md:text-[13px]">
        {n}
      </span>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base leading-6 font-bold md:text-[17px] md:leading-[26px]">
          {htmlFor ? <label htmlFor={htmlFor}>{title}</label> : title}
        </h3>
        {hint && <p className="text-muted-foreground text-[12.5px] md:text-[13px]">{hint}</p>}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className={strong ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
      <span className={cn('tabular-nums', strong ? 'font-bold' : 'font-semibold')}>{value}</span>
    </div>
  );
}

/** Every bonus step on one line, so the next gift is always in view as a target. */
function GiftTimeline({ records, bonus }: { records: number; bonus: number }) {
  const t = useTranslations('billing.upgrade');
  const locale = useLocale();
  const next = nextBonusStep(records);
  const pct = trackPct(records, GIFT_TRACK_END);

  return (
    <div className="border-primary/25 bg-primary/5 flex flex-col gap-1.5 rounded-2xl border px-4 pt-3.5 pb-3 md:px-[18px] md:pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="flex items-center gap-2 text-[15px] font-bold md:text-base">
          <IconGift className="text-primary size-[18px] shrink-0" aria-hidden />
          {!bonus && next
            ? t('giftToNext', {
                missing: (next.minPaid - records).toLocaleString(locale),
                count: next.records,
              })
            : t('giftEarned', { count: bonus })}
        </span>
        {bonus > 0 && (
          // Keyed so a bigger gift pops in again rather than just changing digits
          <span
            key={bonus}
            className="bg-primary text-primary-foreground animate-in fade-in zoom-in-50 rounded-full px-2.5 py-1 text-xs font-bold duration-300"
          >
            <span dir="ltr">+{bonus}</span> {t('giftPill')}
          </span>
        )}
      </div>
      <div className="relative mx-3.5 mt-2 h-[62px]" aria-hidden>
        <div className="bg-muted absolute inset-x-0 top-2 h-1.5 rounded-full">
          <span
            className="bg-primary absolute inset-y-0 start-0 rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className="border-primary bg-background absolute top-1 -ms-[7px] size-3.5 rounded-full border-[3px] transition-[inset-inline-start] duration-200 ease-out motion-reduce:transition-none"
          style={{ insetInlineStart: `${pct}%` }}
        />
        {BONUS_STEPS.map((step) => {
          const on = records >= step.minPaid;
          return (
            <div
              key={step.minPaid}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1 rtl:translate-x-1/2"
              style={{ insetInlineStart: `${trackPct(step.minPaid, GIFT_TRACK_END)}%` }}
            >
              <span
                className={cn(
                  'text-primary-foreground flex size-[22px] items-center justify-center rounded-full border-[1.5px] transition-colors',
                  on ? 'bg-primary border-transparent' : 'border-primary bg-background border-dashed',
                )}
              >
                <IconCheck size={12} stroke={3.2} />
              </span>
              <span
                dir="ltr"
                className={cn(
                  'text-sm leading-none font-extrabold transition-colors',
                  on ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                +{step.records}
              </span>
              <span className="text-muted-foreground text-[11px] whitespace-nowrap">
                {t('giftFrom', { count: step.minPaid })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
