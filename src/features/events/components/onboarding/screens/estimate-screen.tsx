'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { TakeoverButton, TakeoverHeading } from '../takeover-shell';
import { CHANNEL_RATES, type MessageChannel } from '../constants';
import {
  GUESTS_ESTIMATE_DEFAULT,
  GUESTS_ESTIMATE_MAX,
  GUESTS_ESTIMATE_MIN,
  GUESTS_ESTIMATE_STEP,
} from '../../../schemas';

/**
 * What it will cost - and explicitly **not** a checkout. Nobody pays here, or
 * anywhere in onboarding.
 *
 * Its job is to make the couple understand the deal before they ever hit a
 * paywall: planning is free, and when they eventually send, this is roughly
 * what it costs. Only the record count is saved. The channel and the price it
 * implies are deliberately not stored - that choice is re-made at payment time
 * and is not a commitment here.
 */

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.6 5.6 1.4-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
      <path d="M19 16l.6 1.8 1.9.7-1.9.8-.6 1.7-.6-1.7-1.9-.8 1.9-.7z" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

export function EstimateScreen({
  initial,
  onFinish,
  onChange,
}: {
  initial?: number;
  onFinish: (records: number) => void;
  onChange: (records: number) => void;
}) {
  const t = useTranslations('onboarding.estimate');
  const [records, setRecords] = useState(initial ?? GUESTS_ESTIMATE_DEFAULT);
  const [channel, setChannel] = useState<MessageChannel>('whatsapp');

  const price = Math.round(records * CHANNEL_RATES[channel]);
  const filled =
    ((records - GUESTS_ESTIMATE_MIN) /
      (GUESTS_ESTIMATE_MAX - GUESTS_ESTIMATE_MIN)) *
    100;
  const fmt = (n: number) => n.toLocaleString('en-US');

  // Call rounds sit in the run of lines rather than in a panel of their own.
  // The framing still matters even without the emphasis: they are a service
  // Kululu performs, so the copy is "we call them", never "you can call them".
  const included = [
    t('included.invitation'),
    t('included.confirmations'),
    t('included.callRounds'),
    t('included.reminder'),
    t('included.thankYou'),
  ];

  const channelButton = (id: MessageChannel, label: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setChannel(id)}
      aria-pressed={channel === id}
      className={cn(
        'flex h-14 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[14px] text-sm font-bold text-[var(--kt-ink)]',
        channel === id
          ? 'border-2 border-[var(--kt-brand)] bg-[rgba(210,60,194,0.05)]'
          : 'border-[1.5px] border-[var(--kt-border)] bg-white',
      )}
    >
      {label}
      {/* The unit sits under the rate rather than beside it: a bare "1.5 ₪"
          invites reading it as the price of the whole thing. */}
      <span className="flex flex-col items-center leading-[1.25] text-[var(--kt-ink-faint)]">
        <span dir="ltr" className="font-[family-name:var(--font-rubik)] text-xs">
          {t('rate', { rate: CHANNEL_RATES[id] })}
        </span>
        <span className="text-[10.5px] font-medium">{t('perRecord')}</span>
      </span>
    </button>
  );

  return (
    <>
      <TakeoverHeading title={t('title')} subtitle={t('subtitle')} />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5 rounded-[20px] border border-[var(--kt-border-soft)] bg-white px-[18px] py-4">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="records"
              className="text-[13.5px] font-semibold text-[var(--kt-ink-muted)]"
            >
              {t('sliderLabel')}
            </label>
            <span
              dir="ltr"
              className="font-[family-name:var(--font-rubik)] text-xl font-extrabold text-[var(--kt-ink)]"
            >
              {fmt(records)}
              {records >= GUESTS_ESTIMATE_MAX ? '+' : ''}
            </span>
          </div>
          <input
            id="records"
            type="range"
            dir="ltr"
            min={GUESTS_ESTIMATE_MIN}
            max={GUESTS_ESTIMATE_MAX}
            step={GUESTS_ESTIMATE_STEP}
            value={records}
            onChange={(e) => {
              const next = Number(e.target.value);
              setRecords(next);
              onChange(next);
            }}
            className="kt-range h-1.5 w-full appearance-none rounded-full outline-none"
            style={{
              background: `linear-gradient(to right, var(--kt-brand) ${filled}%, rgba(26,11,46,0.1) ${filled}%)`,
            }}
          />
          {/* "Record", not "guest": one record can be a family of five, and the
              record is what is billed.

              The extra top margin is the slider's doing: its 28px thumb
              overhangs a 6px track by 11px, so the flex gap alone is measured
              from a box the thumb has already left, and the line ends up
              touching it. */}
          <p className="mt-2.5 text-[11.5px] text-[var(--kt-ink-faint)]">
            {t('sliderHelp')}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="text-[15px] font-bold text-[var(--kt-ink)]">
            {t('channelTitle')}
          </div>
          <div className="flex gap-2">
            {channelButton(
              'whatsapp',
              <>
                <WhatsappIcon />
                {t('channel.whatsapp')}
              </>,
            )}
            {channelButton('sms', t('channel.sms'))}
          </div>
        </div>

        {/* The price keeps the end of the row it used to share, so removing the
            caption beside it does not move it. */}
        <div className="flex items-baseline justify-end gap-3 px-1">
          <span
            dir="ltr"
            className="font-[family-name:var(--font-rubik)] text-3xl font-extrabold tracking-[-0.02em] text-[var(--kt-ink)]"
          >
            ₪ {fmt(price)}
          </span>
        </div>

        <div className="flex flex-col gap-[9px] rounded-[20px] border border-[var(--kt-border-soft)] bg-white px-4 py-3.5">
          <div className="text-xs font-bold tracking-[0.04em] text-[var(--kt-brand)]">
            {t('includedTitle')}
          </div>
          {included.map((line) => (
            <div
              key={line}
              className="flex items-center gap-[9px] text-[13.5px] font-medium text-[var(--kt-ink)]"
            >
              <CheckIcon />
              {line}
            </div>
          ))}

          {/* Everything above is messaging, which is all the price covers - so
              the planning tools that come with it are stated where the couple
              is looking at what they get, not left to be discovered later. */}
          <div className="mt-0.5 flex items-center gap-2.5 rounded-[14px] border border-[rgba(210,60,194,0.18)] bg-[linear-gradient(120deg,rgba(210,60,194,0.07),rgba(167,139,250,0.08))] px-3 py-[11px]">
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,var(--kt-brand),var(--kt-violet))] text-white shadow-[0_4px_12px_rgba(210,60,194,0.28)]">
              <SparkleIcon />
            </span>
            <div className="flex flex-col">
              <span className="text-[13.5px] font-bold text-[var(--kt-ink)]">
                {t('more.title')}
              </span>
              <span className="text-xs text-[var(--kt-ink-muted)]">
                {t('more.description')}
              </span>
            </div>
          </div>
        </div>

        <TakeoverButton onClick={() => onFinish(records)}>
          {t('finish')}
        </TakeoverButton>
      </div>
    </>
  );
}
