import { notFound } from 'next/navigation';
import { CalendarPlus } from 'lucide-react';

import { getGuestEventPageEvent } from '../queries/guest-event-page';
import {
  ACTION_CLASS,
  EventDetails,
  EventTitle,
  GuestEventPageShell,
} from './guest-event-page';
import { InvitationImageViewer } from './invitation-image-viewer';

/**
 * The page the save-the-date SMS links to - the SMS counterpart of the
 * WhatsApp message's image header and "הוספה ליומן" button, which a text
 * message cannot carry.
 *
 * Same design as the reminder page (/r), with the invitation image on top when
 * one is uploaded. Nothing to act on but the calendar: no RSVP (a later
 * Confirmation asks for that), no navigation or gifting yet.
 */
export async function SaveTheDatePage({ code }: { code: string }) {
  const event = await getGuestEventPageEvent(code);

  if (!event) notFound();

  const image = event.invitationImageUrl;

  return (
    <GuestEventPageShell footerDelay="0.46s">
      <EventTitle
        titlePrefix={event.titlePrefix}
        hosts={event.hosts}
        topMargin="86px"
      />

      {image ? (
        <div
          className="reminder-rise mt-9 flex w-full justify-center"
          style={{ animationDelay: '0.24s' }}
        >
          <InvitationImageViewer src={image} />
        </div>
      ) : null}

      <EventDetails
        eventDate={event.eventDate}
        receptionTime={event.receptionTime}
        venueName={event.location?.name}
      />

      {event.eventDate ? (
        <a
          href={`/cal/${code}`}
          className={`${ACTION_CLASS} reminder-rise mt-8 min-h-[62px] text-lg font-semibold tracking-[-0.01em]`}
          style={{ animationDelay: '0.38s' }}
        >
          <CalendarPlus className="text-primary size-[26px] shrink-0" />
          <span>הוספה ליומן</span>
        </a>
      ) : null}
    </GuestEventPageShell>
  );
}
