'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { TakeoverHeading } from '../takeover-shell';
import { ONBOARDING_EVENT_TYPES } from '../constants';
import type { EventTypeKey } from '../../../schemas';

/**
 * The only screen that is purely a choice, so it can be the most visual.
 *
 * Picking a type is also the moment the event comes into existence - from here
 * on the card is backed by a real row, which is why the selection commits
 * before the screen advances.
 */

const ICONS: Record<EventTypeKey, { swatch: string; glow: string; path: React.ReactNode }> = {
  wedding: {
    swatch: 'linear-gradient(135deg,#D23CC2,#B92AAB)',
    glow: '0 6px 16px rgba(210,60,194,0.3)',
    path: (
      <>
        <circle cx="9" cy="13" r="5.5" />
        <circle cx="15" cy="11" r="5.5" />
        <path d="M13.2 4.6L15 2.5l1.8 2.1" />
      </>
    ),
  },
  henna: {
    swatch: 'linear-gradient(135deg,#FF8E73,#e8683f)',
    glow: '0 6px 16px rgba(255,142,115,0.35)',
    path: (
      <>
        <path d="M12 21V9" />
        <path d="M12 9c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6z" />
        <path d="M12 13c0-3-2-5-5-5 0 3 2 5 5 5z" />
        <path d="M7 21h10" />
      </>
    ),
  },
  bar_mitzva: {
    swatch: 'linear-gradient(135deg,#A78BFA,#7F5AF0)',
    glow: '0 6px 16px rgba(167,139,250,0.35)',
    path: (
      <>
        <path d="M4 4v16M20 4v16M4 4h16M4 20h16" />
        <path d="M9 9h6M9 13h6M9 17h4" />
      </>
    ),
  },
  bat_mitzva: {
    swatch: 'linear-gradient(135deg,#FFB84D,#f09a1e)',
    glow: '0 6px 16px rgba(255,184,77,0.35)',
    path: (
      <>
        <path d="M12 3l1.9 5.6 5.6 1.4-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
        <path d="M19 16l.6 1.8 1.9.7-1.9.8-.6 1.7-.6-1.7-1.9-.8 1.9-.7z" />
      </>
    ),
  },
};

export function TypeScreen({
  selected,
  onPick,
}: {
  selected?: EventTypeKey;
  onPick: (eventType: EventTypeKey) => void;
}) {
  const t = useTranslations('onboarding.type');

  return (
    <>
      <TakeoverHeading title={t('title')} subtitle={t('subtitle')} />
      <div className="grid grid-cols-2 gap-3 md:gap-3.5">
        {ONBOARDING_EVENT_TYPES.map((key) => {
          const icon = ICONS[key];
          const isSelected = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              aria-pressed={isSelected}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-2.5 rounded-[20px] px-3 pt-[22px] pb-[18px] transition-[transform,box-shadow] duration-150 md:pt-6 md:pb-5',
                'hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(26,11,46,0.08)]',
                isSelected
                  ? 'border-2 border-[var(--kt-brand)] bg-[rgba(210,60,194,0.06)]'
                  : 'border-[1.5px] border-[var(--kt-border-soft)] bg-white',
              )}
            >
              <span
                className="flex size-[52px] items-center justify-center rounded-2xl text-white"
                style={{ background: icon.swatch, boxShadow: icon.glow }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {icon.path}
                </svg>
              </span>
              <span className="text-base font-bold text-[var(--kt-ink)]">
                {t(`options.${key}` as 'options.wedding')}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
