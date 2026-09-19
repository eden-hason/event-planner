import Image from 'next/image';
import { Calendar, Clock, MapPin } from 'lucide-react';

/**
 * The building blocks of the public per-event pages a guest opens from a
 * message link - the reminder page (/r) and the save-the-date page (/s). Both
 * are one design, so the frame, the title, the detail rows and the action
 * button shape live here once.
 */

/** Shared shape of the page's action buttons - navigate, add to calendar, gift. */
export const ACTION_CLASS =
  'border-border box-border flex w-full items-center justify-center gap-3 rounded-xl border bg-white px-5 transition-colors hover:border-primary hover:bg-[#FFFCFD]';

/**
 * The event date as the pages print it. UTC keeps the rendered day stable
 * across runtimes: event_date is stored as midnight UTC, so reading it in a
 * local zone can slip it a day either way.
 */
export function formatEventDateLabel(eventDate: string | null): string | null {
  return eventDate
    ? new Intl.DateTimeFormat('he-IL', {
        dateStyle: 'full',
        timeZone: 'UTC',
      }).format(new Date(eventDate))
    : null;
}

/**
 * The page frame: the warm background, the rise-in animation and the
 * "powered by" footer. Children are the page's own blocks, each given the
 * `reminder-rise` class and an increasing animationDelay so the page resolves
 * in reading order instead of appearing all at once.
 */
export function GuestEventPageShell({
  children,
  footerDelay,
}: {
  children: React.ReactNode;
  footerDelay: string;
}) {
  return (
    <div
      dir="rtl"
      // theme-locked-light: a guest opens this from an SMS link, anonymously
      // - see the comment above `.theme-locked-light` in globals.css.
      className="theme-locked-light flex min-h-dvh justify-center px-5 pb-10 font-rubik text-[oklch(0.21_0.006_285.9)]"
      style={{
        background:
          'radial-gradient(120% 70% at 50% 0%, #FFF3F8 0%, rgba(255,243,248,0) 62%), radial-gradient(90% 55% at 50% 100%, #FBF4EC 0%, rgba(251,244,236,0) 70%), #FBF8F5',
      }}
    >
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
        {children}

        <p
          className="reminder-rise mt-auto flex items-center gap-2 pt-14 text-[11px] font-medium tracking-[0.18em] text-[oklch(0.62_0.014_285.9)] uppercase"
          style={{ animationDelay: footerDelay }}
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

/**
 * The "החתונה של" frame as an eyebrow above the host names, which are set
 * large with a primary-coloured ampersand between them.
 */
export function EventTitle({
  titlePrefix,
  hosts,
  topMargin,
}: {
  titlePrefix: string | null;
  hosts: string[];
  /** Space above the title block - generous when it opens the page. */
  topMargin: string;
}) {
  return (
    <>
      {titlePrefix ? (
        <p
          className="text-muted-foreground reminder-rise text-[13px] font-medium tracking-[0.16em]"
          style={{ animationDelay: '0.1s', marginTop: topMargin }}
        >
          {titlePrefix}
        </p>
      ) : null}

      <h1
        className="reminder-rise mt-3.5 text-center text-[clamp(38px,12vw,60px)] leading-[1.05] font-semibold tracking-[-0.035em] text-pretty"
        style={{
          animationDelay: '0.18s',
          marginTop: titlePrefix ? undefined : topMargin,
        }}
      >
        {hosts.map((host, index) => (
          <span key={host}>
            {index > 0 ? (
              <span className="text-primary font-normal"> &amp; </span>
            ) : null}
            {host}
          </span>
        ))}
      </h1>
    </>
  );
}

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

/** Date, reception time and venue - each row only when it is known. */
export function EventDetails({
  eventDate,
  receptionTime,
  venueName,
}: {
  eventDate: string | null;
  receptionTime: string | null;
  venueName: string | null | undefined;
}) {
  const dateLabel = formatEventDateLabel(eventDate);

  return (
    <div
      className="border-border reminder-rise mt-10 w-full border-t"
      style={{ animationDelay: '0.3s' }}
    >
      {dateLabel ? (
        <DetailRow
          icon={<Calendar className="text-primary size-[19px] shrink-0" />}
          label="תאריך"
        >
          {dateLabel}
        </DetailRow>
      ) : null}

      {receptionTime ? (
        <DetailRow
          icon={<Clock className="text-primary size-[19px] shrink-0" />}
          label="קבלת פנים"
        >
          <span dir="ltr">{receptionTime}</span>
        </DetailRow>
      ) : null}

      {venueName ? (
        <DetailRow
          icon={<MapPin className="text-primary size-[19px] shrink-0" />}
          label="מקום"
        >
          {venueName}
        </DetailRow>
      ) : null}
    </div>
  );
}
