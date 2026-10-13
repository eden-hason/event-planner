'use client';

import { useTranslations } from 'next-intl';
import { rsvpPresentation, RSVP_STATUSES } from '@/features/guests/utils';
import type { RsvpHeadcounts } from '@/features/guests/utils/rsvp-headcounts';
import { cn } from '@/lib/utils';

/**
 * The RSVP meter's legend: each status's dot, name and Guest count. Shared by
 * the desktop meter and the phone's meter card, which size it apart.
 */
export function RsvpStatusLegend({ counts }: { counts: RsvpHeadcounts }) {
  const t = useTranslations('guests.list');

  return (
    <>
      {RSVP_STATUSES.map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span
            className={cn('size-[7px] rounded-full', rsvpPresentation(status).solid)}
          />
          {t(`status.${status}`)}
          <b className="text-foreground font-bold tabular-nums">
            {counts[status].toLocaleString()}
          </b>
        </span>
      ))}
    </>
  );
}
