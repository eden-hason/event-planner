'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  TakeoverButton,
  TakeoverError,
  TakeoverHeading,
  TakeoverSkipButton,
} from '../takeover-shell';

/** Today as `YYYY-MM-DD`, in the viewer's own timezone rather than UTC. */
function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * The date, plus an explicit escape hatch.
 *
 * Many couples sign up before the date is locked, and the old flow turned them
 * away by making it required. "We don't have a date yet" is a legitimate path,
 * not a failure - it is recorded as an answer, and the copy must not make it
 * feel like skipping.
 */
export function DateScreen({
  initial,
  onSubmit,
  onSkip,
  onChange,
}: {
  initial: string | null;
  onSubmit: (isoDate: string) => void;
  onSkip: () => void;
  onChange: (isoDate: string | null) => void;
}) {
  const t = useTranslations('onboarding.date');
  const [value, setValue] = useState(initial ? initial.slice(0, 10) : '');
  const [isPast, setIsPast] = useState(false);

  const handleChange = (next: string) => {
    const past = !!next && next < todayISO();
    setIsPast(past);
    // A past date is refused rather than stored, so the card never shows a
    // countdown that has already run out.
    setValue(past ? '' : next);
    onChange(past || !next ? null : next);
  };

  return (
    <>
      <TakeoverHeading title={t('title')} subtitle={t('subtitle')} />
      <div className="flex flex-col gap-3">
        <input
          type="date"
          value={value}
          min={todayISO()}
          onChange={(e) => handleChange(e.target.value)}
          aria-label={t('title')}
          className="h-[54px] w-full rounded-2xl border-[1.5px] border-[var(--kt-border)] bg-white px-[18px] font-[family-name:var(--font-rubik)] text-base text-[var(--kt-ink)] outline-none focus:border-[var(--kt-brand)] focus:shadow-[0_0_0_3px_rgba(210,60,194,0.18)]"
        />
        {isPast && <TakeoverError>{t('pastError')}</TakeoverError>}
        <TakeoverButton
          disabled={!value}
          onClick={() => value && onSubmit(value)}
          className="mt-1.5"
        >
          {t('continue')}
        </TakeoverButton>
        <TakeoverSkipButton onClick={onSkip}>{t('skip')}</TakeoverSkipButton>
      </div>
    </>
  );
}
