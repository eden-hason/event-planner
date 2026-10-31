import { canReceiveSms, isValidPhone } from '@/lib/phone';
import { inAudience } from './audience';

/**
 * Sending a Schedule that already went out to the Guest Records it never
 * reached - guests added to the list after the send, or whose phone came late
 * (CONTEXT.md: Catch-up Send, ADR 0050, backlog 0007).
 *
 * Pure on purpose: who may be caught up is the whole safety story of both the
 * Owner's Catch-up Send and the Back Office's late-guest send, so it lives here
 * where it can be tested without a database. The service loads the rows; this
 * decides. It speaks in codes, not copy: the Owner's drawer is localized and
 * the Back Office is Hebrew-only (ADR 0037), and each words them itself.
 */

export type CatchUpGuestRow = {
  id: string;
  name: string;
  phone: string | null;
  rsvpStatus: string;
  groupName: string | null;
  createdAt: string;
};

export type CatchUpDeliveryRow = {
  guestId: string;
  status: string;
  /** `next_attempt_at` is set: the Worker or a manual send is about to claim it */
  queued: boolean;
  /** An attempt is still waiting on its outcome */
  attemptPending: boolean;
  notSentReason: string | null;
};

/** Why an older record never got it, when it was in the audience at the time */
export type CatchUpNote = 'no_phone' | 'outside_package' | 'other';

/** Why a guest who never got it cannot be caught up */
export type CatchUpExclusion =
  | 'failed'
  | 'outside_package'
  | 'no_phone'
  | 'sms_abroad';

/** Why a Schedule cannot be caught up on at all */
export type CatchUpRejection =
  | 'cancelled'
  | 'expired'
  | 'disabled'
  | 'not_sent_yet'
  | 'event_over';

export type CatchUpCandidate = {
  id: string;
  name: string;
  phone: string;
  groupName: string | null;
  rsvpStatus: string;
  createdAt: string;
  /** Joined the list after the Schedule went out - the case this exists for */
  addedAfterSend: boolean;
  note: CatchUpNote | null;
};

export type CatchUpExcluded = {
  id: string;
  name: string;
  phone: string | null;
  reason: CatchUpExclusion;
};

export type CatchUpSplit = {
  /** Guest records in the Schedule's target audience today */
  audienceCount: number;
  /** Already received it - never offered again */
  reachedCount: number;
  /** Queued or mid-attempt - offering them would race the send already under way */
  inFlightCount: number;
  /** May be sent now, the newest additions first */
  eligible: CatchUpCandidate[];
  /** Never got it, but cannot be sent, with the reason */
  excluded: CatchUpExcluded[];
};

/**
 * The phone rule the renderer applies for a Schedule's channel: an SMS cannot
 * reach a number from abroad (SMS is Israeli-only), so for that channel such a
 * guest has no usable phone. Injected into splitCatchUp rather than called
 * from it, because the test runner cannot load libphonenumber's metadata.
 */
export function phoneProblemFor(channel: string | null) {
  return (phone: string | null): CatchUpExclusion | null => {
    if (!isValidPhone(phone)) return 'no_phone';
    if (channel === 'sms' && !canReceiveSms(phone)) return 'sms_abroad';
    return null;
  };
}

const REACHED = new Set(['sent', 'delivered', 'read']);

function noteFor(notSentReason: string | null): CatchUpNote {
  return notSentReason === 'no_phone' || notSentReason === 'outside_package'
    ? notSentReason
    : 'other';
}

/** The guest joined the list after the Schedule went out */
export function addedAfter(createdAt: string, sentAt: string | null) {
  const sent = sentAt ? Date.parse(sentAt) : NaN;
  return Number.isFinite(sent) && Date.parse(createdAt) > sent;
}

/** Where one guest stands with a Schedule that went out, as a catch-up sees it */
export type CatchUpStanding =
  | { kind: 'not_in_audience' }
  /** Already received it - never offered again */
  | { kind: 'reached' }
  /** Queued or mid-attempt - offering it would race the send already under way */
  | { kind: 'in_flight' }
  /** Never got it, but cannot be sent it */
  | { kind: 'excluded'; reason: CatchUpExclusion }
  | { kind: 'eligible'; addedAfterSend: boolean; note: CatchUpNote | null };

/**
 * One guest's standing with a sent Schedule. The single rule behind the
 * Back Office's late-guest list, the Owner's Catch-up Send and the guest
 * list's "didn't get the latest message" filter.
 */
export function classifyCatchUp(
  guest: { phone: string | null; rsvpStatus: string; createdAt: string },
  delivery: Omit<CatchUpDeliveryRow, 'guestId'> | undefined,
  context: {
    /** The Schedule's audience filter; null means every guest record */
    targetStatus: string | null;
    /** Outside the Record Package (ADR 0027) - never sent to */
    outside: boolean;
    /** Why this phone cannot receive the Schedule, or null - see phoneProblemFor */
    phoneProblem: (phone: string | null) => CatchUpExclusion | null;
    /** When the Schedule went out, to mark who joined after it */
    sentAt: string | null;
  },
): CatchUpStanding {
  if (!inAudience(context.targetStatus, guest.rsvpStatus)) {
    return { kind: 'not_in_audience' };
  }
  if (delivery && REACHED.has(delivery.status)) return { kind: 'reached' };
  if (delivery?.status === 'failed') {
    // A failure has its own handling - the Operator's resend and SMS
    // Fallback (ADR 0012), beside the error. Offering it here would hide why
    // it failed, and a Guest-level failure would only fail again.
    return { kind: 'excluded', reason: 'failed' };
  }
  if (
    delivery?.status === 'pending' &&
    (delivery.queued || delivery.attemptPending)
  ) {
    return { kind: 'in_flight' };
  }

  // No delivery at all, a not-sent record, or a reservation nothing ever
  // attempted: this guest never got the message.
  if (context.outside) return { kind: 'excluded', reason: 'outside_package' };
  const problem = context.phoneProblem(guest.phone);
  if (problem) return { kind: 'excluded', reason: problem };

  return {
    kind: 'eligible',
    addedAfterSend: addedAfter(guest.createdAt, context.sentAt),
    note: delivery ? noteFor(delivery.notSentReason) : null,
  };
}

export function splitCatchUp(params: {
  guests: CatchUpGuestRow[];
  deliveries: CatchUpDeliveryRow[];
  targetStatus: string | null;
  /** Records outside the Record Package (ADR 0027) - never sent to */
  outsideIds: ReadonlySet<string>;
  phoneProblem: (phone: string | null) => CatchUpExclusion | null;
  sentAt: string | null;
}): CatchUpSplit {
  const { guests, targetStatus, outsideIds, phoneProblem, sentAt } = params;
  const byGuest = new Map(params.deliveries.map((row) => [row.guestId, row]));

  let audienceCount = 0;
  let reachedCount = 0;
  let inFlightCount = 0;
  const eligible: CatchUpCandidate[] = [];
  const excluded: CatchUpExcluded[] = [];

  for (const guest of guests) {
    const standing = classifyCatchUp(guest, byGuest.get(guest.id), {
      targetStatus,
      outside: outsideIds.has(guest.id),
      phoneProblem,
      sentAt,
    });
    if (standing.kind === 'not_in_audience') continue;
    audienceCount += 1;
    if (standing.kind === 'reached') reachedCount += 1;
    else if (standing.kind === 'in_flight') inFlightCount += 1;
    else if (standing.kind === 'excluded') {
      excluded.push({ id: guest.id, name: guest.name, phone: guest.phone, reason: standing.reason });
    } else {
      eligible.push({
        id: guest.id,
        name: guest.name,
        phone: guest.phone!,
        groupName: guest.groupName,
        rsvpStatus: guest.rsvpStatus,
        createdAt: guest.createdAt,
        addedAfterSend: standing.addedAfterSend,
        note: standing.note,
      });
    }
  }

  eligible.sort((a, b) => {
    if (a.addedAfterSend !== b.addedAfterSend) return a.addedAfterSend ? -1 : 1;
    return (
      b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name)
    );
  });

  return { audienceCount, reachedCount, inFlightCount, eligible, excluded };
}

/**
 * Guest Records that did not get a sent Schedule and could be caught up on it,
 * phone and package aside: the guest list's "didn't get the latest message"
 * filter (ADR 0050). Those with no phone or outside the package are included -
 * they missed it too, and their drawer says why it cannot be sent yet. A
 * failure is not: it is the Operator's to handle.
 */
export function missedCatchUpIds(
  guests: readonly { id: string; rsvpStatus: string; createdAt: string }[],
  schedule: {
    targetStatus: string | null;
    sentAt: string | null;
    deliveries: readonly CatchUpDeliveryRow[];
  },
): string[] {
  const byGuest = new Map(schedule.deliveries.map((row) => [row.guestId, row]));
  const context = {
    targetStatus: schedule.targetStatus,
    outside: false,
    phoneProblem: () => null,
    sentAt: schedule.sentAt,
  };
  return guests
    .filter(
      (guest) =>
        classifyCatchUp({ ...guest, phone: null }, byGuest.get(guest.id), context).kind ===
        'eligible',
    )
    .map((guest) => guest.id);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Why a Schedule cannot be caught up on, or null when it can.
 *
 * Only a Schedule that went out qualifies: one still planned will include
 * every guest on the list when it sends, so a manual send now would be the
 * duplicate. The Event-date rule is the RSVP Cutoff and mirrors the
 * Dispatcher's `expiryReason` - an Event Reminder to a wedding that ended last
 * night is the harmful case - with the same Thank You exception. The
 * Dispatcher's lateness limit deliberately does not apply: a catch-up is late
 * by definition.
 */
export function catchUpRejection(params: {
  status: string | null;
  dispatchedAt: string | null;
  scheduleTypeKey: string;
  eventDate: string | null;
  now: Date;
}): CatchUpRejection | null {
  const { status, dispatchedAt, scheduleTypeKey, eventDate, now } = params;

  if (status === 'cancelled') return 'cancelled';
  if (status === 'expired') return 'expired';
  if (status === 'disabled') return 'disabled';
  if (status !== 'sent' && !dispatchedAt) return 'not_sent_yet';

  if (eventDate && scheduleTypeKey !== 'post_event') {
    // event_date is a calendar date at 00:00 UTC; the Event is over once that
    // day has ended.
    const eventEnded = Date.parse(eventDate) + DAY_MS;
    if (Number.isFinite(eventEnded) && now.getTime() > eventEnded) {
      return 'event_over';
    }
  }

  return null;
}

export type CatchUpScheduleRow = {
  id: string;
  typeKey: string;
  status: string | null;
  sentAt: string | null;
  dispatchedAt: string | null;
};

/** When a Schedule went out: its recorded send, or failing that its claim */
export function wentOutAt(
  schedule: Pick<CatchUpScheduleRow, 'status' | 'sentAt' | 'dispatchedAt'>,
) {
  if (schedule.status !== 'sent' && !schedule.dispatchedAt) return null;
  return schedule.sentAt ?? schedule.dispatchedAt;
}

/**
 * The Schedule Types a Catch-up Send can be made on. From the Event Reminder
 * on, the plan is about the day itself - table numbers, navigation, thanks -
 * and a guest who missed the ask is caught up on the ask, not on those.
 */
export const CATCH_UP_TYPE_KEYS = ['initial_invitation', 'confirmation'] as const;

/**
 * The one Schedule an Owner can catch a Guest up on: the latest Initial
 * Invitation or Confirmation that went out (ADR 0050). Once only the
 * Invitation has gone, it is the Invitation; once a Confirmation has, the
 * latest Confirmation. An Event Reminder or Thank You that went out since never
 * takes its place. Everything still planned reaches the guest by itself, since
 * a Schedule's audience is resolved when it sends.
 */
export function pickCatchUpSchedule<T extends CatchUpScheduleRow>(
  schedules: readonly T[],
): T | null {
  let latest: { schedule: T; at: number } | null = null;
  for (const schedule of schedules) {
    if (!(CATCH_UP_TYPE_KEYS as readonly string[]).includes(schedule.typeKey)) continue;
    if (schedule.status === 'cancelled') continue;
    const at = Date.parse(wentOutAt(schedule) ?? '');
    if (!Number.isFinite(at)) continue;
    if (!latest || at > latest.at) latest = { schedule, at };
  }
  return latest?.schedule ?? null;
}
