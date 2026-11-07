'use client';

import { useTranslations } from 'next-intl';
import { rsvpPresentation, RSVP_STATUSES } from '@/features/guests/utils';
import {
  headcountShare,
  type RsvpHeadcounts,
} from '@/features/guests/utils/rsvp-headcounts';

/**
 * The RSVP overview's stacked bar: each status's share of the Guests, in its
 * colour, read out as the counts behind it. Shared by the desktop and phone
 * overviews.
 */
export function RsvpMeterBar({ counts }: { counts: RsvpHeadcounts }) {
  const t = useTranslations('guests.list.status');
  return (
    <div
      role="img"
      aria-label={RSVP_STATUSES.map((key) => `${counts[key]} ${t(key)}`).join(
        ', ',
      )}
      className="bg-muted flex h-1.5 gap-0.5 overflow-hidden rounded-full"
    >
      {RSVP_STATUSES.map((key) => (
        <div
          key={key}
          className={rsvpPresentation(key).solid}
          style={{ width: `${headcountShare(counts, key)}%` }}
        />
      ))}
    </div>
  );
}
