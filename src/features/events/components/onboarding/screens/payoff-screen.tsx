'use client';

import { useTranslations } from 'next-intl';
import { EventCard, type EventCardData } from '../event-card';
import { TakeoverButton } from '../takeover-shell';

/**
 * The moment the event becomes real.
 *
 * The card expands to full size and is, for a beat, the only thing on screen -
 * their names, their date, a countdown, their venue. Then it carries them into
 * the dashboard, where the same card becomes the hero of their workspace. The
 * continuity is the whole point: what they made is what they keep.
 */
export function PayoffScreen({
  card,
  onEnter,
  pending,
}: {
  card: EventCardData;
  onEnter: () => void;
  pending: boolean;
}) {
  const t = useTranslations('onboarding.payoff');

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col justify-center gap-6">
      <div className="animate-[kt-card-bloom_0.8s_cubic-bezier(0.16,1,0.3,1)_0.1s_both]">
        <EventCard data={card} size="hero" />
      </div>
      <div className="flex animate-[kt-fade-up_0.5s_cubic-bezier(0.16,1,0.3,1)_0.9s_both] flex-col gap-3">
        <p className="text-center text-[15px] text-[var(--kt-ink-muted)]">
          {t('subtitle')}
        </p>
        <TakeoverButton onClick={onEnter} disabled={pending} pulse className="w-full">
          {pending ? t('entering') : t('cta')}
        </TakeoverButton>
      </div>
    </div>
  );
}
