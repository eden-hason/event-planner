'use client';

import { useTranslations } from 'next-intl';
import { EventCard, type EventCardData } from '../event-card';
import { TakeoverButton } from '../takeover-shell';

/**
 * The frame around a resumed Draft Event.
 *
 * Someone returning to an unfinished event should never land mid-flow with no
 * explanation, so the return is acknowledged and the card is shown already
 * partly built - the proof that nothing they answered was lost.
 */
export function WelcomeBackScreen({
  card,
  names,
  onResume,
}: {
  card: EventCardData;
  /** Their names, if the names screen was reached; used to greet them by name. */
  names?: string;
  onResume: () => void;
}) {
  const t = useTranslations('onboarding.welcomeBack');

  return (
    <div className="mx-auto flex w-full max-w-[460px] animate-[kt-fade-up_0.5s_cubic-bezier(0.16,1,0.3,1)_both] flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-[26px] leading-tight font-bold text-balance md:text-3xl">
          {names ? t('titleNamed', { names }) : t('title')}
        </h1>
        <p className="text-[15px] text-[var(--kt-ink-muted)] md:text-base">
          {t('subtitle')}
        </p>
      </div>
      <div className="animate-[kt-card-bloom_0.6s_cubic-bezier(0.16,1,0.3,1)_0.15s_both]">
        <EventCard data={card} size="full" />
      </div>
      <TakeoverButton onClick={onResume} className="w-full">
        {t('resume')}
      </TakeoverButton>
    </div>
  );
}
