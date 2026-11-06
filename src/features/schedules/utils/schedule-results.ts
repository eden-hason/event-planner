import { ADMIN_TIME_ZONE } from '@/lib/date-time';

import type { SmsFallbackReason } from './send-helpers';
import { carriesReadReceipt } from './hand-delivery';

import type {
  GuestDeliveryOutcome,
  GuestInteractionRow,
} from '../queries/guest-interactions';

/**
 * Where a guest's message stands, in the words of a messaging app's ticks
 * rather than the Delivery's own states (CONTEXT.md, Delivery):
 *
 * - `pending`  nothing accepted yet - a Delivery reserved but not attempted, or
 *              an SMS Fallback still to go out
 * - `sent`     accepted and not confirmed (Sent): one tick
 * - `received` reached the phone on either channel (Delivered): two ticks
 * - `read`     a WhatsApp read receipt, or an answer, which implies one (Read)
 * - `failed`   every attempt failed and nothing further is pending
 *
 * plus the records nothing was sent to, which keep their own reason.
 */
export type MessageState =
  | 'pending'
  | 'sent'
  | 'received'
  | 'read'
  | 'failed'
  | 'no_phone'
  | 'outside_package'
  | 'none';

export function messageState(row: GuestInteractionRow): MessageState {
  switch (row.delivery) {
    case null:
      return 'none';
    case 'whatsapp':
      return row.seen ? 'read' : 'received';
    case 'sms':
      return 'received';
    case 'on_its_way':
      // No attempt recorded yet: reserved just before sending
      return row.steps.length > 0 ? 'sent' : 'pending';
    case 'sms_on_its_way':
      // An SMS accepted and awaiting its report is sent; a Fallback the
      // sweeper has yet to send is still to go.
      return row.steps.some((step) => step.channel === 'sms' && !step.failedAt)
        ? 'sent'
        : 'pending';
    case 'not_delivered':
      return 'failed';
    default:
      return row.delivery;
  }
}

/**
 * The guest's answer to this Schedule. `not_asked` for a guest it did not ask
 * (a confirmed guest on an Advance Reminder), who has nothing to wait for.
 */
type RsvpState = 'confirmed' | 'declined' | 'pending' | 'not_asked';

export function rsvpState(row: GuestInteractionRow): RsvpState {
  if (row.response === 'rsvp_confirm') return 'confirmed';
  if (row.response === 'rsvp_decline') return 'declined';
  return row.notAsked ? 'not_asked' : 'pending';
}

/**
 * How much of the guest table a desktop pane has room for. The table is the
 * desktop view at any width - the phone's list is the phone's, switched at the
 * app's own breakpoint - so a narrowing pane folds columns away in steps rather
 * than swapping layouts:
 *
 * - `full`    every column
 * - `medium`  the phone number moves under the name
 * - `compact` no last update either; the activity turns from a strip to a list
 * - `tight`   no message column either, where the answer is there to read
 *
 * Widths are the table's own, in px, at Tailwind's container sizes.
 */
export type GuestTableTier = 'full' | 'medium' | 'compact' | 'tight';

const TABLE_TIERS: [GuestTableTier, number][] = [
  ['full', 672],
  ['medium', 512],
  ['compact', 448],
];

export function guestTableTier(width: number): GuestTableTier {
  return TABLE_TIERS.find(([, min]) => width >= min)?.[0] ?? 'tight';
}

/** The columns a tier folds away, as TanStack column visibility */
export function guestTableHiddenColumns(
  tier: GuestTableTier,
  collectsRsvp: boolean,
): Record<string, false> {
  const hidden: Record<string, false> = {};
  if (tier === 'full') return hidden;
  hidden.phone = false;
  if (tier === 'medium') return hidden;
  hidden.lastUpdate = false;
  // Without an answer column, the message is all the row says about the send
  if (tier === 'tight' && collectsRsvp) hidden.message = false;
  return hidden;
}

const NOT_REACHED: GuestDeliveryOutcome[] = [
  'on_its_way',
  'sms_on_its_way',
  'not_delivered',
  'no_phone',
  'outside_package',
];

export type GuestFilter =
  | 'all'
  | 'notReached'
  | 'noResponse'
  | 'confirmed'
  | 'unseen';

/**
 * The filter chips a schedule offers. Answer filters only where the schedule
 * collects RSVPs, and "no read receipt" only where a read receipt can exist.
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
        (row.delivery === 'whatsapp' || row.delivery === 'sms') &&
        !row.response &&
        !row.notAsked
      );
    case 'confirmed':
      return row.response === 'rsvp_confirm';
    case 'unseen':
      return row.delivery === 'whatsapp' && carriesReadReceipt(row) && !row.seen;
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
  | 'delivered_by_hand'
  | 'seen'
  | 'not_delivered'
  | 'on_its_way'
  | 'sms_on_its_way'
  | 'no_phone'
  | 'outside_package'
  | 'confirmed'
  | 'declined';

export type JourneyStep = {
  kind: JourneyStepKind;
  at?: string;
  channel?: 'whatsapp' | 'sms';
  /** Why a `sent` is an SMS Fallback; absent or null when it is not one */
  fallback?: SmsFallbackReason | null;
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
  if (row.delivery === 'outside_package') return [{ kind: 'outside_package' }];

  const steps: JourneyStep[] = [];
  for (const step of row.steps) {
    // A Hand Delivery is one step: the Kululu team got it there (ADR 0052).
    // It has no send of its own to tell, and no receipt can follow it.
    if (step.byHand) {
      steps.push({ kind: 'delivered_by_hand', at: step.deliveredAt, channel: 'whatsapp' });
      continue;
    }
    steps.push({
      kind: 'sent',
      at: step.sentAt,
      channel: step.channel,
      fallback: step.fallback,
    });
    // Both channels report delivery; only WhatsApp reports reading.
    if (step.deliveredAt) {
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
  if (row.delivery === 'sms_on_its_way') {
    ordered.push({ kind: 'sms_on_its_way', channel: 'sms' });
  }
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

// Intl formatters are costly to build and a results render formats every row
// and step, so each locale-and-options pair is built once and kept.
const formatters = new Map<string, Intl.DateTimeFormat | Intl.RelativeTimeFormat>();

function dateFormat(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `d|${locale}|${JSON.stringify(options)}`;
  let format = formatters.get(key) as Intl.DateTimeFormat | undefined;
  if (!format) formatters.set(key, (format = new Intl.DateTimeFormat(locale, options)));
  return format;
}

function relativeFormat(locale: string, options: Intl.RelativeTimeFormatOptions) {
  const key = `r|${locale}|${JSON.stringify(options)}`;
  let format = formatters.get(key) as Intl.RelativeTimeFormat | undefined;
  if (!format) formatters.set(key, (format = new Intl.RelativeTimeFormat(locale, options)));
  return format;
}

function israelDayKey(date: Date): string {
  return dateFormat('en-CA', {
    timeZone: ADMIN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * How long ago a moment was: "5 minutes ago", "3 hours ago", "2 days ago".
 * Minutes under an hour, hours under two days, days after that. A moment after
 * `now` (clock skew) reads as now, as does anything under a minute.
 */
export function formatAgo(
  iso: string,
  { now, locale }: { now: Date; locale: string },
): string {
  const minutes = Math.max(
    Math.round((now.getTime() - new Date(iso).getTime()) / 60_000),
    0,
  );
  const hours = Math.round(minutes / 60);
  const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
    minutes === 0
      ? [0, 'second']
      : minutes < 60
        ? [-minutes, 'minute']
        : hours < 48
          ? [-hours, 'hour']
          : [-Math.round(hours / 24), 'day'];

  // ICU writes Hebrew's singular and dual with the count in brackets as well -
  // "לפני שעתיים (2)" - though the word already says it.
  return relativeFormat(locale, { numeric: 'auto' })
    .format(value, unit)
    .replace(BRACKETED_COUNT, '');
}

/** A count repeated in brackets after a word that already says it */
const BRACKETED_COUNT = /\s*\(\d+\)/;

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
  const time = dateFormat(locale, {
    timeZone: ADMIN_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at);

  const day = israelDayKey(at);
  if (day === israelDayKey(now)) return time;
  if (day === israelDayKey(new Date(now.getTime() - 86_400_000))) {
    const yesterday = relativeFormat(locale, { numeric: 'auto', style: 'short' });
    return `${yesterday.format(-1, 'day')} ${time}`;
  }
  return dateFormat(locale, {
    timeZone: ADMIN_TIME_ZONE,
    day: 'numeric',
    month: 'numeric',
  }).format(at);
}

/**
 * Whom a Schedule asks for an RSVP: every Guest (a Confirmation), only those who
 * had not answered (an Advance Reminder, whose family has an RSVP-ask row), or
 * no one. Decides whether the Results tab shows answers, and against whom.
 */
export type RsvpAsk = 'everyone' | 'pending' | 'none';

export function rsvpAskOf(scheduleTypeKey: string, asksPendingGuests: boolean): RsvpAsk {
  if (scheduleTypeKey === 'confirmation') return 'everyone';
  return asksPendingGuests ? 'pending' : 'none';
}
