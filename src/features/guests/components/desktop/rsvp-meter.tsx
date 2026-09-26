'use client';

import { useTranslations } from 'next-intl';
import type { GuestWithGroupApp } from '@/features/guests/schemas';
import { rsvpPresentation, RSVP_STATUSES } from '@/features/guests/utils';
import { cn } from '@/lib/utils';

/**
 * The slim RSVP meter above the list: one stacked bar, the share confirmed, and
 * guests alongside guest records. Counts are Guests (sum of amounts); the list
 * below counts rows. Information only - filtering lives in the status chips.
 */
export function RsvpMeter({ guests }: { guests: GuestWithGroupApp[] }) {
  const t = useTranslations('guests.list');
  const heads = (status?: string) =>
    guests
      .filter((guest) => !status || guest.rsvpStatus === status)
      .reduce((sum, guest) => sum + (guest.amount ?? 1), 0);
  const total = heads();
  const share = (n: number) => (total ? (n / total) * 100 : 0);
  const counts = Object.fromEntries(
    RSVP_STATUSES.map((status) => [status, heads(status)]),
  );

  return (
    <div className="flex items-center gap-[22px] pt-1 pb-1">
      <div className="flex shrink-0 items-baseline gap-1.5">
        <span className="text-[26px] leading-none font-extrabold tabular-nums">
          {Math.round(share(counts.confirmed))}%
        </span>
        <span className="text-muted-foreground text-[13px]">
          {t('meter.confirmed')}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
        <div className="bg-muted flex h-2 gap-0.5 overflow-hidden rounded-full">
          {RSVP_STATUSES.map((status) => (
            <div
              key={status}
              className={rsvpPresentation(status).solid}
              style={{ width: `${share(counts[status])}%` }}
            />
          ))}
        </div>
        <div className="text-muted-foreground flex justify-between gap-3 text-[12.5px]">
          <div className="flex gap-4">
            {RSVP_STATUSES.map((status) => (
              <span key={status} className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    'size-[7px] rounded-full',
                    rsvpPresentation(status).solid,
                  )}
                />
                {t(`status.${status}`)}
                <b className="text-foreground font-bold tabular-nums">
                  {counts[status].toLocaleString()}
                </b>
              </span>
            ))}
          </div>
          <span>
            {t('meter.line', {
              guests: total.toLocaleString(),
              records: guests.length.toLocaleString(),
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
