import { notFound } from 'next/navigation';
import Image from 'next/image';
import { IconMapPin } from '@tabler/icons-react';

import { getReminderPageEvent } from '../queries/reminder';

/**
 * Base of the Bit payment deep link, with the recipient's phone appended.
 *
 * This has to match the base that was registered on the approved WhatsApp
 * template's gift button, which is the only place it previously existed - it
 * was never in this codebase. Verify it against Meta's template manager before
 * relying on it in production.
 */
const BIT_LINK_BASE = 'https://www.bitpay.co.il/app/me/';

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
  const event = await getReminderPageEvent(code);

  if (!event) notFound();

  const hasGifting = Boolean(event.paybox || event.bit);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <Image
          src="/kululu-logo-gray.svg"
          alt="Kululu"
          width={96}
          height={32}
          priority
        />
        <h1 className="mt-4 text-2xl font-semibold text-balance">
          {event.title}
        </h1>
        {event.location?.name ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <IconMapPin className="size-4 shrink-0" />
            {event.location.name}
          </p>
        ) : null}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <a
          href={`/nav/${code}`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-12 items-center justify-center gap-2 rounded-lg text-base font-medium transition-colors"
        >
          <IconMapPin className="size-5" />
          ניווט לאירוע
        </a>

        {hasGifting ? (
          <>
            <p className="text-muted-foreground mt-4 text-center text-sm">
              רוצים לשלוח מתנה?
            </p>

            {event.bit ? (
              <a
                href={`${BIT_LINK_BASE}${event.bit.phoneNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card hover:bg-accent flex h-12 items-center justify-center gap-2 rounded-lg border text-base font-medium transition-colors"
              >
                <Image
                  src="/gift-bit-logo.svg"
                  alt=""
                  width={24}
                  height={24}
                  aria-hidden
                />
                מתנה בביט
              </a>
            ) : null}

            {event.paybox ? (
              <a
                href={event.paybox.link}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card hover:bg-accent flex h-12 items-center justify-center gap-2 rounded-lg border text-base font-medium transition-colors"
              >
                <Image
                  src="/gift-paybox-logo.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-sm"
                  aria-hidden
                />
                מתנה ב-PayBox
              </a>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
