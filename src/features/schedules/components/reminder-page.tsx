import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Gift } from 'lucide-react';

import { getGuestEventPageEvent } from '../queries/guest-event-page';
import {
  ACTION_CLASS,
  EventDetails,
  EventTitle,
  GuestEventPageShell,
} from './guest-event-page';

/**
 * The page every event reminder links to.
 *
 * Navigation and gifting live here rather than in the message so that the
 * message itself stays one body of text on both channels, and so a guest who
 * opens the link days later reaches whatever the organiser has configured by
 * then rather than what was configured when the message was sent.
 *
 * Deliberately per-event, keyed by short code: it carries nothing about the
 * guest who opened it, which is also why the table number stays in the message
 * body where it can be personalised.
 */
export async function ReminderPage({ code }: { code: string }) {
  const event = await getGuestEventPageEvent(code);

  if (!event) notFound();

  const hasGifting = Boolean(event.paybox || event.bit);
  const hasLocation = Boolean(event.location?.name || event.location?.coords);

  return (
    <GuestEventPageShell footerDelay="0.5s">
      <EventTitle
        titlePrefix={event.titlePrefix}
        hosts={event.hosts}
        topMargin="86px"
      />

      <EventDetails
        eventDate={event.eventDate}
        receptionTime={event.receptionTime}
        venueName={event.location?.name}
      />

      {hasLocation ? (
        <a
          href={`/nav/${code}`}
          className={`${ACTION_CLASS} reminder-rise mt-8 min-h-[62px] text-lg font-semibold tracking-[-0.01em]`}
          style={{ animationDelay: '0.38s' }}
        >
          <Image
            src="/waze-logo.svg"
            alt=""
            width={30}
            height={30}
            className="block shrink-0"
            aria-hidden
          />
          <span>נווט עם Waze</span>
        </a>
      ) : null}

      {hasGifting ? (
        <section
          className="reminder-rise mt-10 w-full"
          style={{ animationDelay: '0.44s' }}
        >
          <div className="flex items-center gap-3.5">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground flex items-center gap-2 text-[13px] font-medium tracking-[0.14em] whitespace-nowrap">
              <Gift className="text-primary size-4 shrink-0" />
              <span>הענקת מתנה</span>
            </span>
            <span className="bg-border h-px flex-1" />
          </div>

          <div className="mt-[18px] flex flex-col gap-3">
            {event.bit ? (
              <a
                href={event.bit.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`${ACTION_CLASS} min-h-[58px] text-[17px] font-medium`}
              >
                <Image
                  src="/gift-bit-logo.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="block shrink-0 rounded-[7px]"
                  aria-hidden
                />
                <span>ביט</span>
              </a>
            ) : null}

            {event.paybox ? (
              <a
                href={event.paybox.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`${ACTION_CLASS} min-h-[58px] text-[17px] font-medium`}
              >
                <Image
                  src="/gift-paybox-logo.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="block shrink-0 rounded-[7px]"
                  aria-hidden
                />
                <span>PayBox</span>
              </a>
            ) : null}
          </div>
        </section>
      ) : null}
    </GuestEventPageShell>
  );
}
