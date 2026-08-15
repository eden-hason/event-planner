'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  TakeoverButton,
  TakeoverHeading,
  TakeoverInput,
} from '../takeover-shell';

/**
 * Who they are, asked once before the questions begin.
 *
 * This is the only place a name and phone are captured today, so it stays in
 * the flow rather than being deferred to a settings screen that does not exist
 * yet.
 */
export function ProfileScreen({
  initialFullName,
  initialPhone,
  onSubmit,
  pending,
}: {
  initialFullName: string;
  initialPhone: string;
  onSubmit: (values: { fullName: string; phone: string }) => void;
  pending: boolean;
}) {
  const t = useTranslations('onboarding.profile');
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);

  // The name is what everything else is addressed to; the phone is a courtesy
  // channel we can ask for again later, so it never blocks the flow.
  const ready = !!fullName.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !pending) onSubmit({ fullName, phone });
      }}
      className="flex w-full flex-col gap-3"
    >
      <TakeoverHeading title={t('title')} subtitle={t('subtitle')} />

      <label
        htmlFor="fullName"
        className="text-[13px] font-semibold text-[var(--kt-ink-muted)]"
      >
        {t('nameLabel')}
      </label>
      <TakeoverInput
        id="fullName"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder={t('namePlaceholder')}
        autoComplete="name"
      />

      <label
        htmlFor="phone"
        className="mt-1.5 text-[13px] font-semibold text-[var(--kt-ink-muted)]"
      >
        {t('phoneLabel')}{' '}
        <span className="font-normal text-[var(--kt-ink-ghost)]">
          {t('optional')}
        </span>
      </label>
      {/* `dir="ltr"` keeps the digits in dialling order - a phone number is
          never mirrored - but it also drags the placeholder to the left edge,
          away from the label above it. The right alignment puts it back on the
          side the page reads from. */}
      <div dir="ltr">
        <TakeoverInput
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^0-9 +-]/g, ''))}
          inputMode="numeric"
          placeholder="050-000-0000"
          autoComplete="tel"
          className="px-4 text-right font-[family-name:var(--font-rubik)]"
        />
      </div>
      <p className="text-xs leading-relaxed text-[var(--kt-ink-faint)]">
        {t('phoneHelp')}
      </p>

      <TakeoverButton type="submit" disabled={!ready || pending} className="mt-2">
        {t('continue')}
      </TakeoverButton>
    </form>
  );
}
