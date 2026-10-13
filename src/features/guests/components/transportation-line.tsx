'use client';

import { useTranslations } from 'next-intl';
import { IconBus } from '@tabler/icons-react';
import type { GuestWithGroupApp } from '@/features/guests/schemas';
import { transportationSummary } from '@/features/guests/utils/transportation-summary';
import { cn } from '@/lib/utils';

/**
 * The answers to the transportation question, in the RSVP meter, while the
 * Event asks it. Counts Guests who are coming, like the meter; "not answered"
 * stays its own number so it is never read as "no". Computed from the same
 * list the page renders, so it moves with every saved answer.
 */
export function TransportationLine({
  guests,
  className,
}: {
  guests: GuestWithGroupApp[];
  className?: string;
}) {
  const t = useTranslations('guests.list.transport');
  const summary = transportationSummary(guests);

  return (
    <div
      className={cn(
        'text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]',
        className,
      )}
    >
      <span className="text-foreground inline-flex items-center gap-1.5 font-semibold">
        <IconBus size={14} aria-hidden />
        {t('title')}
      </span>
      {(['yes', 'no', 'unanswered'] as const).map((key) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          {t(key)}
          <b className="text-foreground font-bold tabular-nums">{summary[key].toLocaleString()}</b>
        </span>
      ))}
    </div>
  );
}
