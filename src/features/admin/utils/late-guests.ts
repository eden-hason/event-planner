import { canReceiveSms, isValidPhone } from '@/lib/phone';

/**
 * Sending a Schedule that already went out to the Guest Records it never
 * reached - in practice, guests added to the list after the send (backlog 0007).
 *
 * Pure on purpose: who may receive a top-up is the whole safety story of the
 * Back Office's late-guest send, so it lives here where it can be tested
 * without a database. The service loads the rows; this decides.
 */

export type LateGuestRow = {
  id: string;
  name: string;
  phone: string | null;
  rsvpStatus: string;
  groupName: string | null;
  createdAt: string;
};

export type LateDeliveryRow = {
  guestId: string;
  status: string;
  /** `next_attempt_at` is set: the Worker or a manual send is about to claim it */
  queued: boolean;
  /** An attempt is still waiting on its outcome */
  attemptPending: boolean;
  notSentReason: string | null;
};

export type LateGuestCandidate = {
  id: string;
  name: string;
  phone: string;
  groupName: string | null;
  rsvpStatus: string;
  createdAt: string;
  /** Joined the list after the Schedule went out - the case this exists for */
  addedAfterSend: boolean;
  /** Why an older record never got it, when it was in the audience at the time */
  note: string | null;
};

export type LateGuestExcluded = {
  id: string;
  name: string;
  phone: string | null;
  reason: string;
};

export type LateGuestSplit = {
  /** Guest records in the Schedule's target audience today */
  audienceCount: number;
  /** Already received it - never offered again from here */
  reachedCount: number;
  /** Queued or mid-attempt - offering them would race the send already under way */
  inFlightCount: number;
  /** May be sent now, the newest additions first */
  eligible: LateGuestCandidate[];
  /** Never got it, but cannot be sent from here, with the reason */
  excluded: LateGuestExcluded[];
};

/**
 * The phone rule the renderer applies for a Schedule's channel: an SMS cannot
 * reach a number from abroad (SMS is Israeli-only), so for that channel such a
 * guest has no usable phone. Injected into splitLateGuests rather than called
 * from it, because the test runner cannot load libphonenumber's metadata.
 */
export function phoneProblemFor(channel: string | null) {
  return (phone: string | null): string | null => {
    if (!isValidPhone(phone)) return 'אין מספר טלפון תקין';
    if (channel === 'sms' && !canReceiveSms(phone)) {
      return 'מספר מחו"ל - התזמון הזה נשלח ב-SMS, שמגיע רק למספרים בישראל';
    }
    return null;
  };
}

const REACHED = new Set(['sent', 'delivered', 'read']);

const NOT_SENT_NOTES: Record<string, string> = {
  no_phone: 'לא נשלח בזמנו - לא היה מספר טלפון',
  outside_package: 'לא נשלח בזמנו - הרשומה הייתה מחוץ לחבילה',
};

export function splitLateGuests(params: {
  guests: LateGuestRow[];
  deliveries: LateDeliveryRow[];
  /** The Schedule's audience filter; null means every guest record */
  targetStatus: string | null;
  /** Records outside the Record Package (ADR 0027) - never sent to */
  outsideIds: ReadonlySet<string>;
  /** Why this phone cannot receive the Schedule, or null - see phoneProblemFor */
  phoneProblem: (phone: string | null) => string | null;
  /** When the Schedule went out, to mark who joined after it */
  sentAt: string | null;
}): LateGuestSplit {
  const { guests, targetStatus, outsideIds, phoneProblem, sentAt } = params;
  const byGuest = new Map(params.deliveries.map((row) => [row.guestId, row]));
  const sentAtMs = sentAt ? Date.parse(sentAt) : NaN;

  // The same audience predicate the send engine uses: a guest outside the
  // Schedule's target (a confirmed guest, for a reminder to the pending) is not
  // late, they were never meant to get it, so they are not listed at all.
  const audience = guests.filter((guest) => !targetStatus || guest.rsvpStatus === targetStatus);

  let reachedCount = 0;
  let inFlightCount = 0;
  const eligible: LateGuestCandidate[] = [];
  const excluded: LateGuestExcluded[] = [];

  for (const guest of audience) {
    const delivery = byGuest.get(guest.id);

    if (delivery && REACHED.has(delivery.status)) {
      reachedCount += 1;
      continue;
    }
    if (delivery?.status === 'failed') {
      // A failure has its own resend, on the Schedule's row, which shows the
      // error beside it. Offering it here too would hide why it failed.
      excluded.push({
        id: guest.id,
        name: guest.name,
        phone: guest.phone,
        reason: 'השליחה אליו נכשלה - שליחה חוזרת נעשית מהשורה של התזמון בציר התקשורת',
      });
      continue;
    }
    if (delivery?.status === 'pending' && (delivery.queued || delivery.attemptPending)) {
      inFlightCount += 1;
      continue;
    }

    // No delivery at all, a not-sent record, or a reservation nothing ever
    // attempted: this guest never got the message.
    if (outsideIds.has(guest.id)) {
      excluded.push({
        id: guest.id,
        name: guest.name,
        phone: guest.phone,
        reason: 'מחוץ לחבילת הרשומות - צריך להגדיל את החבילה לפני שאפשר לשלוח',
      });
      continue;
    }
    const problem = phoneProblem(guest.phone);
    if (problem) {
      excluded.push({ id: guest.id, name: guest.name, phone: guest.phone, reason: problem });
      continue;
    }

    const createdMs = Date.parse(guest.createdAt);
    eligible.push({
      id: guest.id,
      name: guest.name,
      phone: guest.phone!,
      groupName: guest.groupName,
      rsvpStatus: guest.rsvpStatus,
      createdAt: guest.createdAt,
      addedAfterSend: Number.isFinite(sentAtMs) && createdMs > sentAtMs,
      note: delivery
        ? (NOT_SENT_NOTES[delivery.notSentReason ?? ''] ?? 'לא נשלח בזמנו')
        : null,
    });
  }

  eligible.sort((a, b) => {
    if (a.addedAfterSend !== b.addedAfterSend) return a.addedAfterSend ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name);
  });

  return {
    audienceCount: audience.length,
    reachedCount,
    inFlightCount,
    eligible,
    excluded,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Why a Schedule cannot be topped up, or null when it can.
 *
 * Only a Schedule that went out qualifies: one still planned will include
 * every guest on the list when it sends, so a manual send now would be the
 * duplicate. The Event-date rule mirrors the Dispatcher's `expiryReason` - an
 * Event Reminder to a wedding that ended last night is the harmful case - with
 * the same Thank You exception. The Dispatcher's lateness limit deliberately
 * does not apply: a top-up is late by definition.
 */
export function lateSendRejection(params: {
  status: string | null;
  dispatchedAt: string | null;
  scheduleTypeKey: string;
  eventDate: string | null;
  now: Date;
}): string | null {
  const { status, dispatchedAt, scheduleTypeKey, eventDate, now } = params;

  if (status === 'cancelled') return 'התזמון בוטל';
  if (status === 'expired') return 'התזמון פג בלי שנשלח, אז אין למי להשלים';
  if (status === 'disabled') return 'השליחה לא הופעלה לתזמון הזה';
  if (status !== 'sent' && !dispatchedAt) {
    return 'התזמון עוד לא נשלח - כשיישלח הוא יכלול את כל האורחים שברשימה באותו רגע';
  }

  if (eventDate && scheduleTypeKey !== 'post_event') {
    // event_date is a calendar date at 00:00 UTC; the Event is over once that
    // day has ended.
    const eventEnded = Date.parse(eventDate) + DAY_MS;
    if (Number.isFinite(eventEnded) && now.getTime() > eventEnded) {
      return 'האירוע כבר עבר';
    }
  }

  return null;
}
