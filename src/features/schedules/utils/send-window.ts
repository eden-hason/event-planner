import { ADMIN_TIME_ZONE, israelWallClockToIso } from '@/lib/date-time';

/**
 * The Send Window: the hours Kululu is willing to make a phone buzz.
 *
 * A Due Time is a request, not an instruction (ADR 0015). Until the Dispatcher
 * ran every minute nothing honoured the authored instant - the daily cron sent
 * everything at 10:05 Israel - so business hours were an accident of the
 * schedule rather than a rule. Honouring the instant removes that accident and
 * lets Kululu message a wedding guest at 3am, which is what this exists to stop.
 *
 * One rule, evaluated in Israel wall clock because that is where the guests are
 * and where the Operator authored the time: a daily window, 09:00 to 21:00 by
 * default, every day of the week.
 *
 * There used to be a second rule, a Friday 15:00 to Saturday 20:00 Shabbat
 * block. It was removed on purpose so Schedules go out on weekends like any
 * other day - see ADR 0018.
 *
 * Evaluated at dispatch rather than at authoring, because the case it exists
 * for is Kululu being down all evening and coming back at midnight to a queue
 * of Schedules that all came due while it was away.
 */

export type SendWindow = {
  /** Israel wall clock, "HH:mm". Inclusive. */
  start: string;
  /** Israel wall clock, "HH:mm". Exclusive - 21:00 is already closed. */
  end: string;
};

const DAY_MS = 86_400_000;

const PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: ADMIN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

type IsraelClock = {
  /** "YYYY-MM-DD" in Israel. */
  date: string;
  /** Minutes since Israel midnight. */
  minutes: number;
};

function israelClock(instant: Date): IsraelClock {
  const parts = Object.fromEntries(
    PARTS.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function parseClock(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Send window bound must be HH:mm, got "${value}"`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * The instant of a wall clock on an Israel calendar date, `dayOffset` days on.
 * Goes through israelWallClockToIso so DST is handled in exactly one place -
 * adding 24 hours of milliseconds would be an hour out twice a year.
 */
function israelInstant(date: string, dayOffset: number, minutes: number): Date {
  const shifted = new Date(Date.parse(`${date}T00:00:00Z`) + dayOffset * DAY_MS);
  const ymd = shifted.toISOString().slice(0, 10);
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const iso = israelWallClockToIso(ymd, clock);
  if (!iso) throw new Error(`Could not resolve ${ymd} ${clock} in ${ADMIN_TIME_ZONE}`);
  return new Date(iso);
}

export function isWithinSendWindow(instant: Date, window: SendWindow): boolean {
  const clock = israelClock(instant);
  const start = parseClock(window.start);
  const end = parseClock(window.end);
  return clock.minutes >= start && clock.minutes < end;
}

/**
 * The first moment at or after `instant` that the Send Window is open.
 *
 * Returns `instant` itself when it is already open, so an on-time Schedule is
 * dispatched at exactly its Due Time and nothing is nudged by rounding.
 *
 * Loops until the answer is stable. Two passes is the worst case (after
 * closing moves to the next morning, which is then open); the bound is there
 * so a bug fails loudly instead of spinning.
 */
export function nextOpenSlot(instant: Date, window: SendWindow): Date {
  const start = parseClock(window.start);
  const end = parseClock(window.end);
  if (start >= end) {
    throw new Error(
      `Send window opens at ${window.start} and closes at ${window.end}, which is never open`,
    );
  }

  let candidate = instant;
  for (let pass = 0; pass < 8; pass += 1) {
    const clock = israelClock(candidate);

    if (clock.minutes < start) {
      candidate = israelInstant(clock.date, 0, start);
      continue;
    }

    if (clock.minutes >= end) {
      candidate = israelInstant(clock.date, 1, start);
      continue;
    }

    return candidate;
  }

  throw new Error('Could not find an open send slot - check the window configuration');
}
