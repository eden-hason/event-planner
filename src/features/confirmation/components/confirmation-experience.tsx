'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  MapPin,
  Minus,
  Plus,
  Send,
  X,
} from 'lucide-react';

import { recordViewInteraction, submitConfirmation } from '../actions';
import { buildMealOptions, mealLabel } from '../utils/meal-options';
import type { ConfirmationPageData } from '../schemas';

/**
 * The stepper's ceiling. A party larger than this is a conversation with the
 * hosts rather than a number a guest sets on their own.
 */
const MAX_GUESTS = 12;

/** Shared shape of the ruled rows - the same list the reminder page draws. */
function DetailRow({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border flex items-center gap-3.5 border-b px-1 py-[18px]">
      {icon}
      <span className="shrink-0 text-[15px] text-[oklch(0.442_0.014_285.9)]">
        {label}
      </span>
      <span className="ms-auto text-end text-base font-medium tabular-nums">
        {children}
      </span>
    </div>
  );
}

function clampCount(amount: number | undefined): number {
  return Math.min(MAX_GUESTS, Math.max(1, amount || 1));
}

/**
 * The two times an event can carry, under the names the type gives them.
 *
 * A mitzva's reception is the aliya and its ceremony slot is the party, so the
 * same two columns have to be read out differently or the guest is told the
 * wrong thing about their own evening.
 */
function buildTimeRows(
  event: ConfirmationPageData['event'],
): { label: string; value: string }[] {
  const isMitzva =
    event.eventType === 'bar_mitzva' || event.eventType === 'bat_mitzva';

  const rows: { label: string; value: string }[] = [];
  if (event.receptionTime) {
    rows.push({
      label: isMitzva ? 'עלייה לתורה' : 'קבלת פנים',
      value: event.receptionTime,
    });
  }
  if (event.ceremonyTime) {
    rows.push({
      label: isMitzva ? 'מסיבה וריקודים' : 'חופה',
      value: event.ceremonyTime,
    });
  }
  return rows;
}

/**
 * The page a guest lands on from their invitation link: the event first, then
 * the one thing we are asking them for.
 *
 * Deliberately not templated. The RSVP is the only transaction the product has
 * with a guest, so it gets one drawing that the hosts cannot break, rather than
 * a design each event picks - which is also why the page carries no navigation
 * to the venue: that lives on the reminder, sent when it is useful.
 */
export function ConfirmationExperience({
  token,
  data,
}: {
  token: string;
  data: ConfirmationPageData;
}) {
  const { guest, event, scheduleId } = data;

  const mealOptions = buildMealOptions(event.guestExperience);
  const lockGuestCount = event.guestExperience?.lockGuestCount ?? false;
  const timeRows = buildTimeRows(event);

  // UTC keeps the rendered day stable: event_date is stored as midnight UTC,
  // and this formats in the guest's own browser, so an unpinned render showed
  // guests west of UTC a different day than the message that sent them here.
  const dateLabel = event.eventDate
    ? new Intl.DateTimeFormat('he-IL', {
        dateStyle: 'full',
        timeZone: 'UTC',
      }).format(new Date(event.eventDate))
    : null;

  const [choice, setChoice] = useState<'confirmed' | 'declined' | null>(
    guest.rsvpStatus === 'pending' ? null : guest.rsvpStatus,
  );
  const [count, setCount] = useState(() => clampCount(guest.amount));
  const [meal, setMeal] = useState(guest.mealChoice ?? '');
  const [note, setNote] = useState(guest.guestNotes ?? '');
  // The meal list is optional and long enough to bury the submit button, so it
  // opens only for guests who care - or who already picked something.
  const [mealOpen, setMealOpen] = useState(Boolean(guest.mealChoice));
  // A guest who already answered lands on their answer, not on a form asking
  // again - the reason they reopened the link is usually to check or change it.
  const [done, setDone] = useState(guest.rsvpStatus !== 'pending');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (scheduleId) {
      recordViewInteraction(guest.id, scheduleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCouple = event.eventType === 'wedding' || event.eventType === 'henna';
  const detailsOpen = choice === 'confirmed';
  const mealVisible = mealOptions.length > 0;

  const handleSubmit = async () => {
    if (!choice || pending) return;
    setPending(true);
    setError('');

    const formData = new FormData();
    formData.set('token', token);
    formData.set('rsvpStatus', choice);
    if (choice === 'confirmed') {
      formData.set('guestCount', String(count));
      if (meal) formData.set('mealChoice', meal);
    }
    formData.set('notes', note);

    try {
      const result = await submitConfirmation(null, formData);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setDone(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      dir="rtl"
      // theme-locked-light: a guest opens this from an SMS/WhatsApp link,
      // anonymously - see the comment above `.theme-locked-light` in
      // globals.css.
      className="theme-locked-light flex min-h-dvh justify-center px-5 pb-10 font-[family-name:var(--font-rubik)] text-[oklch(0.21_0.006_285.9)]"
      style={{
        background:
          'radial-gradient(120% 70% at 50% 0%, #FFF3F8 0%, rgba(255,243,248,0) 62%), radial-gradient(90% 55% at 50% 100%, #FBF4EC 0%, rgba(251,244,236,0) 70%), #FBF8F5',
      }}
    >
      {/* The event resolves in reading order on load; the answer, which only
          appears once it has been given, arrives on its own shorter beat. */}
      <style>{`
        @keyframes rsvp-rise-in {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes rsvp-reveal-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes rsvp-pop-in {
          0% { opacity: 0; transform: scale(0.82); }
          60% { transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes rsvp-draw-check {
          from { stroke-dashoffset: 32; }
          to { stroke-dashoffset: 0; }
        }
        .rsvp-rise { animation: rsvp-rise-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .rsvp-reveal { animation: rsvp-reveal-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .rsvp-pop { animation: rsvp-pop-in 0.55s 0.05s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .rsvp-draw { stroke-dasharray: 32; animation: rsvp-draw-check 0.5s 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .rsvp-rise, .rsvp-reveal, .rsvp-pop, .rsvp-draw { animation: none; }
        }
      `}</style>

      <main className="flex min-h-dvh w-full max-w-[600px] flex-col items-center pb-10">
        {event.titlePrefix ? (
          <p
            className="text-muted-foreground rsvp-rise mt-[86px] text-[13px] font-medium tracking-[0.16em]"
            style={{ animationDelay: '0.1s' }}
          >
            {event.titlePrefix}
          </p>
        ) : null}

        <h1
          className="rsvp-rise mt-3.5 text-center text-[clamp(38px,12vw,60px)] leading-[1.05] font-semibold tracking-[-0.035em] text-pretty"
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
          className="border-border rsvp-rise mt-10 w-full border-t"
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

          {timeRows.map((row) => (
            <DetailRow
              key={row.label}
              icon={<Clock className="text-primary size-[19px] shrink-0" />}
              label={row.label}
            >
              <span dir="ltr">{row.value}</span>
            </DetailRow>
          ))}

          {event.location?.name ? (
            <DetailRow
              icon={<MapPin className="text-primary size-[19px] shrink-0" />}
              label="מקום"
            >
              {event.location.name}
            </DetailRow>
          ) : null}
        </div>

        {done ? (
          <section className="rsvp-reveal mt-10 flex w-full flex-col items-center">
            <div
              className={`rsvp-pop flex size-[72px] items-center justify-center rounded-full ${
                choice === 'declined' ? 'bg-muted' : 'bg-[#FDF0F7]'
              }`}
            >
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={
                  choice === 'declined'
                    ? 'text-muted-foreground'
                    : 'text-primary'
                }
                aria-hidden
              >
                <path
                  className="rsvp-draw"
                  d={
                    choice === 'declined'
                      ? 'M18 6 6 18 M6 6l12 12'
                      : 'M20 6 9 17l-5-5'
                  }
                />
              </svg>
            </div>

            <h2
              className="rsvp-reveal mt-[22px] text-center text-[26px] font-semibold tracking-[-0.02em]"
              style={{ animationDelay: '0.15s' }}
            >
              {choice === 'declined' ? 'קיבלנו - תודה שעדכנתם' : 'ההגעה אושרה'}
            </h2>
            {/* The answer itself heads the summary, so a guest who reopens the
                link reads it off the same list as the rest of their details. */}
            <div
              className="border-border rsvp-reveal mt-7 w-full border-t"
              style={{ animationDelay: '0.3s' }}
            >
              <DetailRow label="סטטוס">
                {choice === 'declined' ? 'לא מגיעים' : 'מגיעים'}
              </DetailRow>
              {choice === 'confirmed' ? (
                <>
                  <DetailRow label="מספר אורחים">{count}</DetailRow>
                  {mealVisible && meal ? (
                    <DetailRow label="העדפת מנה">{mealLabel(meal)}</DetailRow>
                  ) : null}
                </>
              ) : null}
              {note.trim() ? (
                <DetailRow label={isCouple ? 'הערה לזוג' : 'הערה למארחים'}>
                  <span className="text-pretty">{note.trim()}</span>
                </DetailRow>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setDone(false)}
              className="text-muted-foreground rsvp-reveal mt-[26px] cursor-pointer px-2 py-3 text-sm font-medium underline underline-offset-4"
              style={{ animationDelay: '0.38s' }}
            >
              עדכון התשובה
            </button>
          </section>
        ) : (
          <section
            className="rsvp-rise mt-10 w-full"
            style={{ animationDelay: '0.44s' }}
          >
            <p className="text-center text-[18px] leading-[1.6] font-medium text-[oklch(0.37_0.012_285.9)]">
              נשמח לדעת אם תגיעו
            </p>

            <div className="mt-[18px] flex gap-3">
              {(
                [
                  { value: 'confirmed', label: 'נגיע בשמחה', Icon: Check },
                  { value: 'declined', label: 'לא נוכל להגיע', Icon: X },
                ] as const
              ).map(({ value, label, Icon }) => {
                const active = choice === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setChoice(value);
                      if (value === 'declined') setMeal('');
                    }}
                    className={`box-border flex min-h-[62px] flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-xl border px-3.5 text-base font-semibold tracking-[-0.01em] transition-all duration-200 ${
                      active
                        ? 'border-primary text-primary bg-[#FDF0F7]'
                        : 'border-border bg-white'
                    }`}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Collapsed with grid rows rather than a max-height guess, so the
                panel measures whatever the event's meal list actually is. */}
            <div
              className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ gridTemplateRows: detailsOpen ? '1fr' : '0fr' }}
              aria-hidden={!detailsOpen}
            >
              <div
                className={`overflow-hidden transition-opacity duration-300 ${
                  detailsOpen ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="flex items-center gap-3.5 px-1 pt-6">
                  <span className="flex-1 text-[17px] font-semibold tracking-[-0.01em]">
                    כמה אורחים תגיעו?
                  </span>
                  {lockGuestCount ? (
                    // The host fixed the party size, so the number is stated
                    // rather than offered - a stepper that refuses to move
                    // reads as broken.
                    <span className="text-[19px] font-semibold tabular-nums">
                      {count}
                    </span>
                  ) : (
                    // Ruled into three cells so each control reads as its own
                    // target - a flat row of glyphs was easy to miss as a
                    // thing you could press.
                    <div className="border-border flex items-stretch overflow-hidden rounded-xl border bg-white">
                      <button
                        type="button"
                        aria-label="פחות"
                        disabled={count <= 1}
                        onClick={() => setCount((c) => Math.max(1, c - 1))}
                        className="hover:bg-muted active:bg-muted flex size-12 shrink-0 cursor-pointer items-center justify-center text-[oklch(0.21_0.006_285.9)] transition-colors disabled:cursor-not-allowed disabled:text-[oklch(0.75_0.01_285.9)] disabled:hover:bg-transparent"
                      >
                        <Minus className="size-5" strokeWidth={2.4} />
                      </button>
                      <span className="border-border flex w-14 items-center justify-center border-x text-[19px] font-semibold tabular-nums">
                        {count}
                      </span>
                      <button
                        type="button"
                        aria-label="עוד"
                        disabled={count >= MAX_GUESTS}
                        onClick={() =>
                          setCount((c) => Math.min(MAX_GUESTS, c + 1))
                        }
                        className="hover:bg-muted active:bg-muted flex size-12 shrink-0 cursor-pointer items-center justify-center text-[oklch(0.21_0.006_285.9)] transition-colors disabled:cursor-not-allowed disabled:text-[oklch(0.75_0.01_285.9)] disabled:hover:bg-transparent"
                      >
                        <Plus className="size-5" strokeWidth={2.4} />
                      </button>
                    </div>
                  )}
                </div>

                {mealVisible ? (
                  <div className="px-1 pt-[22px]">
                    <button
                      type="button"
                      aria-expanded={mealOpen}
                      onClick={() => setMealOpen((open) => !open)}
                      className="flex w-full cursor-pointer items-center gap-2 text-start"
                    >
                      <span className="text-[15px] font-medium">העדפת מנה</span>
                      <span className="text-muted-foreground text-[13px]">
                        {meal ? mealLabel(meal) : 'אופציונלי'}
                      </span>
                      <ChevronDown
                        className={`text-muted-foreground ms-auto size-5 shrink-0 transition-transform duration-300 ${
                          mealOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden
                      />
                    </button>

                    <div
                      className="grid transition-[grid-template-rows] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{ gridTemplateRows: mealOpen ? '1fr' : '0fr' }}
                      aria-hidden={!mealOpen}
                    >
                      <div
                        className={`overflow-hidden transition-opacity duration-300 ${
                          mealOpen ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                          {mealOptions.map((option) => {
                            const active = meal === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                aria-pressed={active}
                                tabIndex={mealOpen ? undefined : -1}
                                onClick={() => setMeal(active ? '' : option.id)}
                                className={`box-border flex min-h-[54px] cursor-pointer items-center justify-center rounded-xl border px-3 text-base font-medium transition-all duration-200 ${
                                  active
                                    ? 'border-primary text-primary bg-[#FDF0F7]'
                                    : 'border-border bg-white'
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="px-1 pt-[22px]">
                  <div className="flex items-baseline gap-2">
                    <label
                      htmlFor="rsvp-note"
                      className="text-[15px] font-medium"
                    >
                      {isCouple ? 'הערה לזוג' : 'הערה למארחים'}
                    </label>
                    <span className="text-muted-foreground text-[13px]">
                      אופציונלי
                    </span>
                  </div>
                  <input
                    id="rsvp-note"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="משהו שכדאי שנדע?"
                    className="border-border focus:border-primary mt-3 box-border min-h-[54px] w-full rounded-xl border bg-white px-4 text-base transition-colors outline-none"
                  />
                </div>
              </div>
            </div>

            {error ? (
              <p className="text-destructive mt-4 text-center text-sm">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!choice || pending}
              className={`mt-7 box-border flex min-h-[62px] w-full items-center justify-center gap-2.5 rounded-xl border border-transparent text-lg font-semibold tracking-[-0.01em] transition-all duration-200 ${
                choice
                  ? 'bg-primary text-primary-foreground cursor-pointer shadow-[0_6px_18px_-8px_var(--primary)]'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              } ${pending ? 'opacity-70' : ''}`}
            >
              <Send className="size-[18px] shrink-0" aria-hidden />
              <span>{pending ? 'שולח...' : 'שליחה'}</span>
            </button>
          </section>
        )}

        <p
          className="rsvp-rise mt-auto flex items-center gap-2 pt-14 text-[11px] font-medium tracking-[0.18em] text-[oklch(0.62_0.014_285.9)] uppercase"
          style={{ animationDelay: '0.5s' }}
        >
          <span>מופעל על ידי</span>
          {/* The lockup reads left-to-right in either direction, as a logotype
              does - same treatment as the reminder page's. */}
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
