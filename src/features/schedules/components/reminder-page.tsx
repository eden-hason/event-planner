import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Calendar, Clock, Gift, MapPin } from 'lucide-react';

import { getReminderPageEvent } from '../queries/reminder';

/** Shared shape of the three actions - navigate, Bit, PayBox. */
const ACTION_CLASS =
  'border-border box-border flex w-full items-center justify-center gap-3 rounded-xl border bg-white px-5 transition-colors hover:border-primary hover:bg-[#FFFCFD]';

/**
 * Rows below the title, drawn as a ruled list rather than cards so the page
 * stays one column of text on the narrow screens it is opened on.
 */
function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border flex items-center gap-3.5 border-b px-1 py-[18px]">
      {icon}
      <span className="text-[15px] text-[oklch(0.442_0.014_285.9)]">
        {label}
      </span>
      <span className="ms-auto text-end text-base font-medium tabular-nums">
        {children}
      </span>
    </div>
  );
}

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
  const hasLocation = Boolean(event.location?.name || event.location?.coords);

  // UTC keeps the rendered day stable across runtimes: event_date is stored as
  // midnight UTC, so reading it in a local zone can slip it a day either way.
  const dateLabel = event.eventDate
    ? new Intl.DateTimeFormat('he-IL', {
        dateStyle: 'full',
        timeZone: 'UTC',
      }).format(new Date(event.eventDate))
    : null;

  return (
    <div
      dir="rtl"
      // theme-locked-light: a guest opens this from an SMS link, anonymously
      // - see the comment above `.theme-locked-light` in globals.css.
      className="theme-locked-light flex min-h-dvh justify-center px-5 pb-10 font-[family-name:var(--font-rubik)] text-[oklch(0.21_0.006_285.9)]"
      style={{
        background:
          'radial-gradient(120% 70% at 50% 0%, #FFF3F8 0%, rgba(255,243,248,0) 62%), radial-gradient(90% 55% at 50% 100%, #FBF4EC 0%, rgba(251,244,236,0) 70%), #FBF8F5',
      }}
    >
      {/* Each block rises in on load, staggered top to bottom, so the page
          resolves in reading order instead of appearing all at once. */}
      <style>{`
        @keyframes reminder-rise-in {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: none; }
        }
        .reminder-rise {
          animation: reminder-rise-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .reminder-rise { animation: none; }
        }
      `}</style>

      <main className="flex min-h-dvh w-full max-w-[600px] flex-col items-center pb-10">
        {event.titlePrefix ? (
          <p
            className="text-muted-foreground reminder-rise mt-[86px] text-[13px] font-medium tracking-[0.16em]"
            style={{ animationDelay: '0.1s' }}
          >
            {event.titlePrefix}
          </p>
        ) : null}

        <h1
          className="reminder-rise mt-3.5 text-center text-[clamp(38px,12vw,60px)] leading-[1.05] font-semibold tracking-[-0.035em] text-pretty"
          style={{
            animationDelay: '0.18s',
            marginTop: event.titlePrefix ? undefined : '86px',
          }}
        >
          {event.hosts.map((host, index) => (
            <span key={host}>
              {index > 0 ? (
                <span className="text-primary font-normal"> &amp; </span>
              ) : null}
              {host}
            </span>
          ))}
        </h1>

        <div
          className="border-border reminder-rise mt-10 w-full border-t"
          style={{ animationDelay: '0.3s' }}
        >
          {dateLabel ? (
            <DetailRow
              icon={
                <Calendar className="text-primary size-[19px] shrink-0" />
              }
              label="תאריך"
            >
              {dateLabel}
            </DetailRow>
          ) : null}

          {event.receptionTime ? (
            <DetailRow
              icon={<Clock className="text-primary size-[19px] shrink-0" />}
              label="קבלת פנים"
            >
              <span dir="ltr">{event.receptionTime}</span>
            </DetailRow>
          ) : null}

          {event.location?.name ? (
            <DetailRow
              icon={<MapPin className="text-primary size-[19px] shrink-0" />}
              label="מקום"
            >
              {event.location.name}
            </DetailRow>
          ) : null}
        </div>

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

        <p
          className="reminder-rise mt-auto flex items-center gap-2 pt-14 text-[11px] font-medium tracking-[0.18em] text-[oklch(0.62_0.014_285.9)] uppercase"
          style={{ animationDelay: '0.5s' }}
        >
          <span>מופעל על ידי</span>
          {/* The lockup reads left-to-right in either direction, as a logotype
              does - same treatment as the app shell's. */}
          <span dir="ltr" className="flex items-center gap-1.5">
            <Image
              src="/kululu-logo-gray.svg"
              alt=""
              width={23}
              height={18}
              className="h-[18px] w-auto shrink-0"
              aria-hidden
            />
            <span>Kululu</span>
          </span>
        </p>
      </main>
    </div>
  );
}
