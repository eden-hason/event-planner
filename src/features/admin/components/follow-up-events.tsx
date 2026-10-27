import Link from 'next/link';
import { ChevronLeft } from '@/components/icons';
import { formatPhone } from '@/lib/phone';
import { Band, BandRow, Surface } from './band';
import type { FollowUpEvents as FollowUpEventsData } from '../types';
import { formatEventDate } from '../utils/format';

const TITLE = 'אירועים מאתמול - לחזור לבעלי האירוע היום';

/**
 * A daily reminder, not a sender: the Operator messages each Owner on WhatsApp
 * by hand. It opens the page because it is the one list that is only true today.
 */
export function FollowUpEvents({ day, events }: FollowUpEventsData) {
  const date = formatEventDate(day, { weekday: true });

  if (events.length === 0) {
    return (
      <Band title={TITLE}>
        <BandRow className="text-muted-foreground pb-[18px] text-[13.5px]">
          לא היו אירועים אתמול ({date}), אין למי לחזור היום
        </BandRow>
      </Band>
    );
  }

  return (
    <Band title={`${TITLE} (${events.length})`} className="border-primary/40">
      <p className="text-secondary-foreground px-4 pb-3 text-[13.5px]">
        {events.length === 1 ? 'אירוע אחד התקיים' : `${events.length} אירועים התקיימו`} אתמול,{' '}
        {date}. יש לשלוח היום הודעת וואטסאפ ידנית לבעלי האירוע
      </p>

      {events.map((event) => (
        <Link
          key={event.id}
          href={`/admin/events/${event.id}`}
          className="hover:bg-accent focus-visible:ring-ring flex items-center gap-4 border-t px-4 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate font-medium">{event.title}</span>
            <span className="text-muted-foreground truncate text-[12.5px]">
              {event.eventTypeName} · {event.guestRecords.toLocaleString('he-IL')} רשומות
            </span>
          </span>

          <span className="flex w-44 shrink-0 flex-col gap-0.5 text-end">
            <span className="truncate">{event.ownerName}</span>
            <span className="text-muted-foreground text-[12.5px] tabular-nums">
              {event.ownerPhone ? <span dir="ltr">{formatPhone(event.ownerPhone)}</span> : 'אין טלפון'}
            </span>
          </span>

          <span className="hidden shrink-0 items-center gap-0.5 text-[13px] font-medium sm:flex">
            פתיחת האירוע
            <ChevronLeft className="size-3.5" />
          </span>
        </Link>
      ))}
    </Band>
  );
}

/** Must not read as an empty day: a failed read is not "no events yesterday". */
export function FollowUpEventsError() {
  return (
    <Band title={TITLE}>
      <BandRow className="text-destructive text-[13.5px]">האירועים מאתמול לא נטענו</BandRow>
    </Band>
  );
}

export function FollowUpEventsSkeleton() {
  return (
    <Surface as="section">
      <div className="px-4 pt-4 pb-3">
        <div className="bg-accent h-2.5 w-[240px] animate-pulse rounded-sm" />
      </div>
      {[220, 180].map((width) => (
        <div key={width} className="flex items-center gap-4 border-t px-4 py-3.5">
          <div
            className="bg-accent h-3 animate-pulse rounded-md"
            style={{ maxWidth: width, flex: 1 }}
          />
          <div className="bg-accent ms-auto h-3 w-28 animate-pulse rounded-md" />
          <div className="bg-accent h-3 w-20 animate-pulse rounded-md" />
        </div>
      ))}
    </Surface>
  );
}
