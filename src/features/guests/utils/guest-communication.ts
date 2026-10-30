/**
 * The guest drawer's Communication tab: every Outreach Item on the Event, in
 * plan order, read for one Guest Record - what it did for them, or will - plus
 * the RSVP it led to and, on the latest Invitation or Confirmation that went out, whether the
 * Owner can catch them up on it (CONTEXT.md: Catch-up Send, ADR 0050).
 *
 * Pure: the query loads the rows, this decides what each one means.
 */

import type { GuestInteractionRow } from '@/features/schedules/utils/delivery-outcome';
import {
  catchUpRejection,
  pickCatchUpSchedule,
  splitCatchUp,
  wentOutAt,
  type CatchUpExclusion,
  type CatchUpNote,
} from '@/features/schedules/utils/catch-up';
import {
  comparePlanOrder,
  numberPlan,
  timelineStatus,
} from '@/features/schedules/utils/timeline';

export type CommunicationSchedule = {
  id: string;
  typeKey: string;
  kind: 'message' | 'call';
  status: string | null;
  targetStatus: string | null;
  scheduledDate: string | null;
  sentAt: string | null;
  dispatchedAt: string | null;
};

/** This guest's Delivery for one Schedule, as the Results tab reads it, plus the queue facts */
export type CommunicationDelivery = {
  scheduleId: string;
  status: string;
  queued: boolean;
  attemptPending: boolean;
  notSentReason: string | null;
  journey: GuestInteractionRow;
};

export type CallOutcome = 'no_answer' | 'confirmed' | 'declined';

/** This guest's place in a Call Round, if the round put them on its list */
export type CommunicationCall = {
  scheduleId: string;
  /** Null while they are on the list and not yet called */
  outcome: CallOutcome | null;
  at: string | null;
};

/** An RSVP the Guest gave themselves, in the chat or on the RSVP page */
export type CommunicationAnswer = {
  response: 'confirmed' | 'declined';
  channel: string | null;
  at: string;
};

export type GuestCommunicationInput = {
  guest: {
    id: string;
    name: string;
    rsvpStatus: string;
    amount: number;
    createdAt: string;
    /** The record's RSVP provenance: who set the current answer, and when */
    rsvpChangeSource: 'manual' | 'guest' | 'admin_call' | null;
    rsvpChangedAt: string | null;
    rsvpChangedByName: string | null;
    rsvpChangedByCurrentUser: boolean;
  };
  eventDate: string | null;
  /** The Event may send at all - its billing status allows it */
  canSend: boolean;
  outsidePackage: boolean;
  schedules: CommunicationSchedule[];
  deliveries: CommunicationDelivery[];
  calls: CommunicationCall[];
  answers: CommunicationAnswer[];
  /**
   * Why this guest's phone cannot receive the catch-up message, judged
   * on the server for that Schedule's channel (libphonenumber does not load
   * in tests, so the rule is passed in as its answer).
   */
  catchUpPhoneProblem: CatchUpExclusion | null;
};

/** What one Outreach Item did, or will do, for this guest */
export type CommunicationState =
  // Message Schedules that produced a Delivery
  | 'seen'
  | 'reached'
  | 'on_its_way'
  | 'sms_on_its_way'
  | 'not_delivered'
  | 'no_phone'
  | 'outside_package'
  // Message Schedules that went out without them
  | 'added_after'
  | 'not_in_audience'
  // Message Schedules still to come
  | 'will_get'
  | 'undated'
  | 'locked'
  | 'off'
  // Call Rounds
  | 'called'
  | 'call_queued'
  | 'call_planned';

export type CatchUpOffer =
  | { available: true; addedAfterSend: boolean; note: CatchUpNote | null }
  | {
      available: false;
      reason: CatchUpExclusion | 'event_over' | 'sending_off';
    };

export type CommunicationRow = {
  scheduleId: string;
  kind: 'message' | 'call';
  typeKey: string;
  /** Its place among the Event's Schedules of the same type - "Confirmation 2" */
  number: { index: number; total: number } | null;
  /** The Due Time, or for one that went out, when it did */
  at: string | null;
  state: CommunicationState;
  /** The Delivery's Journey, as on the Results tab; null with no Delivery */
  journey: GuestInteractionRow | null;
  call: { outcome: CallOutcome | null; at: string | null } | null;
  /** Only on the latest Invitation or Confirmation that went out, and only when it means something */
  catchUp: CatchUpOffer | null;
};

export type RsvpSummary = {
  status: string;
  /** How many are coming, for a confirmed answer */
  amount: number | null;
  /** Where the current answer came from; null when nobody has answered */
  source:
    | { kind: 'chat' | 'page' | 'call'; at: string }
    | {
        kind: 'manual';
        at: string;
        byName: string | null;
        byCurrentUser: boolean;
      }
    | null;
};

export type GuestCommunication = {
  rsvp: RsvpSummary;
  rows: CommunicationRow[];
};

function deliveryState(journey: GuestInteractionRow): CommunicationState {
  switch (journey.delivery) {
    case 'whatsapp':
    case 'sms':
      return journey.seen ? 'seen' : 'reached';
    case 'on_its_way':
    case 'sms_on_its_way':
    case 'not_delivered':
    case 'no_phone':
    case 'outside_package':
      return journey.delivery;
    default:
      return 'on_its_way';
  }
}

function inAudience(schedule: CommunicationSchedule, rsvpStatus: string) {
  return !schedule.targetStatus || schedule.targetStatus === rsvpStatus;
}

function messageState(
  schedule: CommunicationSchedule,
  delivery: CommunicationDelivery | undefined,
  guest: GuestCommunicationInput['guest'],
): CommunicationState | null {
  if (delivery) return deliveryState(delivery.journey);

  switch (timelineStatus(schedule)) {
    case 'cancelled':
      return null;
    case 'locked':
      return 'locked';
    case 'expired':
      return 'off';
    case 'undated':
      return 'undated';
    case 'sent': {
      // Every Guest Record a Schedule targeted got a Delivery row, a not-sent
      // one included - so no Delivery means it was not on the list when it
      // went: added since, or not in the audience at the time.
      const went = Date.parse(wentOutAt(schedule) ?? '');
      return Number.isFinite(went) && Date.parse(guest.createdAt) > went
        ? 'added_after'
        : 'not_in_audience';
    }
    default:
      return inAudience(schedule, guest.rsvpStatus)
        ? 'will_get'
        : 'not_in_audience';
  }
}

function callState(
  schedule: CommunicationSchedule,
  call: CommunicationCall | undefined,
  rsvpStatus: string,
): CommunicationState | null {
  if (call) return call.outcome ? 'called' : 'call_queued';
  switch (timelineStatus(schedule)) {
    case 'cancelled':
      return null;
    case 'locked':
      return 'locked';
    case 'expired':
      return 'off';
    case 'sent':
      // A started round froze its call list, and this guest is not on it.
      return 'not_in_audience';
    case 'undated':
      return 'undated';
    default:
      return inAudience(schedule, rsvpStatus)
        ? 'call_planned'
        : 'not_in_audience';
  }
}

function catchUpOffer(
  input: GuestCommunicationInput,
  schedule: CommunicationSchedule,
  delivery: CommunicationDelivery | undefined,
  now: Date,
): CatchUpOffer | null {
  const rejection = catchUpRejection({
    status: schedule.status,
    dispatchedAt: schedule.dispatchedAt,
    scheduleTypeKey: schedule.typeKey,
    eventDate: input.eventDate,
    now,
  });

  const split = splitCatchUp({
    guests: [
      {
        id: input.guest.id,
        name: input.guest.name,
        phone: null,
        rsvpStatus: input.guest.rsvpStatus,
        groupName: null,
        createdAt: input.guest.createdAt,
      },
    ],
    deliveries: delivery
      ? [
          {
            guestId: input.guest.id,
            status: delivery.status,
            queued: delivery.queued,
            attemptPending: delivery.attemptPending,
            notSentReason: delivery.notSentReason,
          },
        ]
      : [],
    targetStatus: schedule.targetStatus,
    outsideIds: new Set(input.outsidePackage ? [input.guest.id] : []),
    phoneProblem: () => input.catchUpPhoneProblem,
    sentAt: wentOutAt(schedule),
  });

  const [eligible] = split.eligible;
  const [excluded] = split.excluded;
  // Reached, mid-send, or not in the audience: nothing to catch up, so nothing to say.
  if (!eligible && !excluded) return null;

  // Past the RSVP Cutoff, or an Event that cannot send: the guest still
  // missed it, and the row says why it cannot be sent now.
  if (rejection === 'event_over')
    return { available: false, reason: 'event_over' };
  if (!input.canSend) return { available: false, reason: 'sending_off' };
  if (excluded) return { available: false, reason: excluded.reason };
  return {
    available: true,
    addedAfterSend: eligible.addedAfterSend,
    note: eligible.note,
  };
}

function rsvpSummary(input: GuestCommunicationInput): RsvpSummary {
  const { guest } = input;
  const amount = guest.rsvpStatus === 'confirmed' ? guest.amount : null;
  if (!guest.rsvpChangedAt)
    return { status: guest.rsvpStatus, amount, source: null };

  const at = guest.rsvpChangedAt;
  switch (guest.rsvpChangeSource) {
    case 'manual':
      return {
        status: guest.rsvpStatus,
        amount,
        source: {
          kind: 'manual',
          at,
          byName: guest.rsvpChangedByName,
          byCurrentUser: guest.rsvpChangedByCurrentUser,
        },
      };
    case 'admin_call':
      return { status: guest.rsvpStatus, amount, source: { kind: 'call', at } };
    case 'guest': {
      // The record says the Guest answered, not where: their latest answer does.
      const latest = [...input.answers].sort((a, b) =>
        b.at.localeCompare(a.at),
      )[0];
      return {
        status: guest.rsvpStatus,
        amount,
        source: {
          kind: latest?.channel === 'whatsapp' ? 'chat' : 'page',
          at: latest?.at ?? at,
        },
      };
    }
    default:
      return { status: guest.rsvpStatus, amount, source: null };
  }
}

export function buildGuestCommunication(
  input: GuestCommunicationInput,
  now: Date = new Date(),
): GuestCommunication {
  const deliveries = new Map(
    input.deliveries.map((delivery) => [delivery.scheduleId, delivery]),
  );
  const calls = new Map(input.calls.map((call) => [call.scheduleId, call]));

  const entries = input.schedules.map((schedule) => ({
    ...schedule,
    scheduleTypeKey: schedule.typeKey,
  }));
  const numbers = numberPlan(entries);
  const catchUpSchedule = pickCatchUpSchedule(input.schedules);

  const rows: CommunicationRow[] = [];
  for (const schedule of [...entries].sort(comparePlanOrder)) {
    const delivery = deliveries.get(schedule.id);
    const call = calls.get(schedule.id);
    const state =
      schedule.kind === 'call'
        ? callState(schedule, call, input.guest.rsvpStatus)
        : messageState(schedule, delivery, input.guest);
    if (!state) continue;

    const number = numbers.get(schedule.id);
    rows.push({
      scheduleId: schedule.id,
      kind: schedule.kind,
      typeKey: schedule.typeKey,
      number: number && number.total > 1 ? number : null,
      at: wentOutAt(schedule) ?? schedule.scheduledDate,
      state,
      journey: delivery?.journey ?? null,
      call: call ? { outcome: call.outcome, at: call.at } : null,
      catchUp:
        catchUpSchedule?.id === schedule.id
          ? catchUpOffer(input, schedule, delivery, now)
          : null,
    });
  }

  return { rsvp: rsvpSummary(input), rows };
}
