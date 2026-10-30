import { notFound } from 'next/navigation';

import { getGuestEventPageEvent } from '../queries/guest-event-page';
import { EventTitle, GuestEventPageShell } from './guest-event-page';

/**
 * The page a Bespoke Template's SMS links to - the SMS counterpart of the
 * WhatsApp message's video header.
 *
 * Same design as the save-the-date page (/s), with the video where that page
 * has the invitation image. Nothing else: the WhatsApp message it stands in
 * for has no buttons, so neither does this.
 */
export async function InvitationVideoPage({ code }: { code: string }) {
  const event = await getGuestEventPageEvent(code);

  if (!event?.invitationVideoUrl) notFound();

  return (
    <GuestEventPageShell footerDelay="0.38s">
      <EventTitle
        titlePrefix={event.titlePrefix}
        hosts={event.hosts}
        topMargin="86px"
      />

      <div
        className="reminder-rise mt-9 flex w-full justify-center"
        style={{ animationDelay: '0.24s' }}
      >
        <video
          src={event.invitationVideoUrl}
          controls
          playsInline
          preload="metadata"
          className="max-h-[70vh] w-full rounded-2xl bg-black shadow-sm"
        />
      </div>
    </GuestEventPageShell>
  );
}
