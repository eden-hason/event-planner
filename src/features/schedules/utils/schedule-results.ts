import { ADMIN_TIME_ZONE } from '@/lib/date-time';

import type {
  GuestDeliveryOutcome,
  GuestInteractionRow,
} from '../queries/guest-interactions';

/**
 * Where one guest stands on the Delivery ladder, in the Owner's words.
 *
 * The channel is not a rung: `sms` is here only because SMS stops at accepted
 * and has nothing further to say about delivery, so "reached by SMS" is its
 * final delivery state. `none` is a guest with no Delivery at all - someone who
 * answered through a shared link.
 */
export type GuestStatus =
  | 'seen'
  | 'delivered'
  | 'sms'
  | 'on_its_way'
  | 'not_delivered'
  | 'no_phone'
  | 'none';

export function guestStatus(row: GuestInteractionRow): GuestStatus {
  switch (row.delivery) {
    case null:
      return 'none';
    case 'whatsapp':
      return row.seen ? 'seen' : 'delivered';
    default:
      return row.delivery;
  }
}

/**
 * The read receipt, told apart from its absence. Only a WhatsApp message can
 * report one, so an SMS guest is `na` - not unseen, a different fact - and so
 * is a guest nothing reached.
 */
export function seenState(row: GuestInteractionRow): 'seen' | 'unseen' | 'na' {
  if (row.delivery === 'whatsapp' || row.delivery === 'on_its_way') {
    return row.seen ? 'seen' : 'unseen';
  }
  return 'na';
}

const NOT_REACHED: GuestDeliveryOutcome[] = [
  'on_its_way',
  'not_delivered',
  'no_phone',
];

export type NotReachedFilter = 'on_its_way' | 'not_delivered' | 'no_phone';

export type GuestFilter =
  | 'all'
  | 'notReached'
  | 'noResponse'
  | 'confirmed'
  | 'unseen'
  | NotReachedFilter;

/**
 * The filter chips a schedule offers. Answer filters only where the schedule
 * collects RSVPs, and "not seen yet" only where a read receipt can exist. The
 * per-reason filters are reached from the not-reached card, not from a chip.
 */
export function availableFilters(options: {
  collectsRsvp: boolean;
  showSeen: boolean;
}): GuestFilter[] {
  if (options.collectsRsvp)
    return ['all', 'notReached', 'noResponse', 'confirmed'];
  if (options.showSeen) return ['all', 'notReached', 'unseen'];
  return ['all', 'notReached'];
}

function matchesFilter(row: GuestInteractionRow, filter: GuestFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'notReached':
      return row.delivery !== null && NOT_REACHED.includes(row.delivery);
    case 'noResponse':
      return (
        (row.delivery === 'whatsapp' || row.delivery === 'sms') && !row.response
      );
    case 'confirmed':
      return row.response === 'rsvp_confirm';
    case 'unseen':
      return row.delivery === 'whatsapp' && !row.seen;
    default:
      return row.delivery === filter;
  }
}

export function filterGuests(
  rows: GuestInteractionRow[],
  { filter, query }: { filter: GuestFilter; query: string },
): GuestInteractionRow[] {
  const needle = query.trim().toLocaleLowerCase();
  return rows.filter(
    (row) =>
      matchesFilter(row, filter) &&
      (!needle || row.guestName.toLocaleLowerCase().includes(needle)),
  );
}

/** The newest thing that happened to this guest, for the "last update" column. */
export function lastActivityAt(row: GuestInteractionRow): string | undefined {
  const times = [
    row.sentAt,
    row.seenAt,
    row.respondedAt,
    ...row.steps.flatMap((step) => [
      step.sentAt,
      step.deliveredAt,
      step.readAt,
      step.failedAt,
    ]),
  ].filter((time): time is string => Boolean(time));
  return times.length ? times.reduce((a, b) => (a > b ? a : b)) : undefined;
}

export type JourneyStepKind =
  | 'sent'
  | 'delivered'
  | 'seen'
  | 'not_delivered'
  | 'on_its_way'
  | 'no_phone'
  | 'confirmed'
  | 'declined';

export type JourneyStep = {
  kind: JourneyStepKind;
  at?: string;
  channel?: 'whatsapp' | 'sms';
  /** A `sent` that is an SMS Fallback */
  fallback?: boolean;
  guestCount?: number;
  mealCounts?: Record<string, number>;
};

/**
 * One guest's timeline across their messages and what they did with them, in
 * time order. Told as a channel story - "sent on WhatsApp, not delivered, sent
 * by SMS" - and never as attempts, which are not the Owner's word.
 */
export function buildJourney(row: GuestInteractionRow): JourneyStep[] {
  if (row.delivery === 'no_phone') return [{ kind: 'no_phone' }];

  const steps: JourneyStep[] = [];
  for (const step of row.steps) {
    steps.push({
      kind: 'sent',
      at: step.sentAt,
      channel: step.channel,
      fallback: step.fallback,
    });
    // SMS reports nothing past accepted, so an SMS message is only ever sent.
    if (step.channel === 'whatsapp' && step.deliveredAt) {
      steps.push({
        kind: 'delivered',
        at: step.deliveredAt,
        channel: step.channel,
      });
    }
    if (step.channel === 'whatsapp' && step.readAt) {
      steps.push({ kind: 'seen', at: step.readAt, channel: step.channel });
    }
    if (step.failedAt) {
      steps.push({
        kind: 'not_delivered',
        at: step.failedAt,
        channel: step.channel,
      });
    }
  }
  // A Delivery from before attempts were recorded still has its own send time.
  if (steps.length === 0 && row.sentAt) {
    steps.push({
      kind: 'sent',
      at: row.sentAt,
      channel: row.delivery === 'sms' ? 'sms' : 'whatsapp',
    });
  }
  if (row.response) {
    steps.push({
      kind: row.response === 'rsvp_confirm' ? 'confirmed' : 'declined',
      at: row.respondedAt,
      guestCount: row.guestCount,
      mealCounts: row.mealCounts,
    });
  }

  // Stable, so steps without a time keep the order they were written in.
  const ordered = steps
    .map((step, index) => ({ step, index }))
    .sort((a, b) => {
      if (a.step.at && b.step.at && a.step.at !== b.step.at)
        return a.step.at.localeCompare(b.step.at);
      return a.index - b.index;
    })
    .map(({ step }) => step);

  if (row.delivery === 'on_its_way') ordered.push({ kind: 'on_its_way' });
  return ordered;
}

/** How long after sending a schedule is still expected to move. */
const LIVE_WINDOW_MS = {
  // RSVP answers cluster in the first 48-72 hours.
  rsvp: 72 * 3_600_000,
  // Read receipts trickle in over the first day.
  other: 24 * 3_600_000,
};

/**
 * Whether the results are still landing or have settled. Anything still on
 * its way keeps them live regardless of age: that guest has a state to change.
 */
export function resultsLiveness(options: {
  sentAt?: string;
  onItsWay: number;
  collectsRsvp: boolean;
  now: Date;
}): 'live' | 'settled' {
  if (options.onItsWay > 0) return 'live';
  if (!options.sentAt) return 'settled';
  const age = options.now.getTime() - new Date(options.sentAt).getTime();
  return age < LIVE_WINDOW_MS[options.collectsRsvp ? 'rsvp' : 'other']
    ? 'live'
    : 'settled';
}

/** A whole-number percentage, 0 when there is nothing to divide by. */
export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function israelDayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ADMIN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * A moment on the results screen, the way a person says it: "18:08" today,
 * "yesterday 21:14", "23.9" before that.
 * Days are Israel days, where the events happen.
 */
export function formatMoment(
  iso: string,
  { now, locale }: { now: Date; locale: string },
): string {
  const at = new Date(iso);
  const rtf = new Intl.RelativeTimeFormat(locale, {
    numeric: 'auto',
    style: 'short',
  });

  const time = new Intl.DateTimeFormat(locale, {
    timeZone: ADMIN_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at);

  const day = israelDayKey(at);
  if (day === israelDayKey(now)) return time;
  if (day === israelDayKey(new Date(now.getTime() - 86_400_000))) {
    return `${rtf.format(-1, 'day')} ${time}`;
  }
  return new Intl.DateTimeFormat(locale, {
    timeZone: ADMIN_TIME_ZONE,
    day: 'numeric',
    month: 'numeric',
  }).format(at);
}
