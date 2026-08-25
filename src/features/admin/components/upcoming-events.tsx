import Link from 'next/link';
import { Band, BandRow } from './band';
import type { UpcomingEvent } from '../types';
import { formatEventDate } from '@/lib/date-time';

function formatDate(iso: string): string {
  return formatEventDate(iso, { year: false });
}

/**
 * A reference list, scanned rather than read: fixed right-aligned columns so
 * dates and rates line up for comparison down the page.
 */
export function UpcomingEvents({ events }: { events: UpcomingEvent[] }) {
  if (events.length === 0) {
    return (
      <Band title="Upcoming">
        <BandRow className="text-muted-foreground pb-[18px] text-[13.5px]">
          No events in the next 30 days
        </BandRow>
      </Band>
    );
  }

  return (
    <Band
      title={`Upcoming (${events.length} in the next 30 days)`}
    >
      {events.map((event) => (
        <Link
          key={event.id}
          href={`/admin/events/${event.id}`}
          className="hover:bg-accent focus-visible:ring-ring flex items-baseline gap-4 border-t px-4 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="min-w-0 flex-1 truncate font-medium">{event.title}</span>

          <span className="text-muted-foreground w-16 shrink-0 text-right tabular-nums">
            {formatDate(event.eventDate)}
          </span>

          {/* Null is not zero: an empty guest list has no rate, and "0%" would
              read as a failing campaign rather than as a list not yet built. */}
          {event.confirmationRate === null ? (
            <span className="text-muted-foreground/70 w-60 shrink-0 text-right">
              no guest list yet
            </span>
          ) : (
            <>
              <span className="text-muted-foreground w-26 shrink-0 text-right tabular-nums">
                {event.guestRecords.toLocaleString('en-GB')} records
              </span>
              <span className="text-secondary-foreground w-30 shrink-0 text-right tabular-nums">
                {Math.round(event.confirmationRate * 100)}% confirmed
              </span>
            </>
          )}
        </Link>
      ))}
    </Band>
  );
}

export function UpcomingEventsError() {
  return (
    <Band title="Upcoming">
      <BandRow className="text-destructive text-[13.5px]">
        Upcoming events didn&apos;t load
      </BandRow>
    </Band>
  );
}

export function UpcomingEventsSkeleton() {
  return (
    <section className="bg-card overflow-hidden rounded-xl border shadow-xs">
      <div className="px-4 pt-4 pb-3">
        <div className="bg-accent h-2.5 w-[190px] animate-pulse rounded-sm" />
      </div>
      {[220, 160, 200].map((width) => (
        <div key={width} className="flex items-center gap-4 border-t px-4 py-3.5">
          <div
            className="bg-accent h-3 animate-pulse rounded-md"
            style={{ maxWidth: width, flex: 1 }}
          />
          <div className="bg-accent ml-auto h-3 w-12 animate-pulse rounded-md" />
          <div className="bg-accent h-3 w-21 animate-pulse rounded-md" />
          <div className="bg-accent h-3 w-25 animate-pulse rounded-md" />
        </div>
      ))}
    </section>
  );
}
