'use client';

import { useTranslations } from 'next-intl';

/**
 * The tinted circles and chips of the results screen, each a tint to sit on and
 * a strong to write with - never the 500-level dot colour on its own tint.
 */
export const RESULT_TONE = {
  ok: 'bg-rsvp-confirmed-tint text-rsvp-confirmed-strong',
  bad: 'bg-rsvp-declined-tint text-rsvp-declined-strong',
  pending: 'bg-warning-tint text-warning-strong',
  info: 'bg-info-tint text-info-strong',
  violet: 'bg-violet-tint text-violet-strong',
  neutral: 'bg-muted text-muted-foreground',
} as const;

export type ResultTone = keyof typeof RESULT_TONE;

/**
 * "4 guests · 1 vegetarian": what an answer carried, for the feed and the
 * journey. Meal keys the catalog has no word for are left out rather than
 * shown raw.
 */
export function useAnswerMeta() {
  const t = useTranslations('schedules.results');
  const tMeal = useTranslations('guests.dietary');

  return (guestCount?: number, mealCounts?: Record<string, number>) => {
    const parts: string[] = [];
    if (guestCount) parts.push(t('people', { count: guestCount }));
    for (const [key, count] of Object.entries(mealCounts ?? {})) {
      if (count > 0 && tMeal.has(key)) parts.push(`${count} ${tMeal(key)}`);
    }
    return parts.join(' · ');
  };
}
