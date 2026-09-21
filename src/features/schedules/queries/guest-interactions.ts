'use server';

import { getEffectiveClient } from '@/lib/supabase/admin';

/**
 * How a schedule's Delivery reads to the Owner (CONTEXT.md: Delivery, Reached).
 *
 * - `whatsapp` / `sms`: Reached, over that channel. An accepted SMS counts -
 *   SMS never reports further than accepted.
 * - `on_its_way`: WhatsApp accepted it, the phone has not confirmed yet.
 * - `not_delivered`: every attempt failed. Deliberately factual - nothing here
 *   promises a retry until an SMS attempt actually exists.
 * - `no_phone`: targeted, but no attempt was possible, so no send ever
 *   happened. Listed in the table and excluded from the audience total.
 */
export type GuestDeliveryOutcome =
  | 'whatsapp'
  | 'sms'
  | 'on_its_way'
  | 'not_delivered'
  | 'no_phone';

/**
 * One message on one channel, as the Owner may see it: which channel, and how
 * far it got. Deliberately without the error code, the provider id or who
 * pressed the button - those are Operator facts (CONTEXT.md: Delivery Attempt).
 */
export type GuestDeliveryStep = {
  channel: 'whatsapp' | 'sms';
  /** An SMS Fallback sent after WhatsApp could not reach the guest */
  fallback: boolean;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  /**
   * When this message was found not to have arrived. The table has no failed-at
   * column, so it is the attempt's last update - the moment the failure landed.
   */
  failedAt?: string;
};

export type GuestInteractionRow = {
  guestId: string;
  guestName: string;
  /** For calling a guest the message did not reach */
  phone?: string;
  /** The Delivery's messages, oldest first. Empty for a guest never sent to */
  steps: GuestDeliveryStep[];
  /** Reached over SMS only because WhatsApp could not reach them */
  viaFallback: boolean;
  /** Null for a guest who interacted but has no delivery record (a shared link) */
  delivery: GuestDeliveryOutcome | null;
  /**
   * WhatsApp read receipt - the guest opened the message itself, which is not
   * the same as `viewed` (that one means they opened the RSVP page). SMS never
   * reports past accepted, so an SMS guest stays false here forever and the UI
   * shows those as not-applicable rather than unseen.
   */
  seen: boolean;
  seenAt?: string;
  /** When the message left us - the only timestamp a guest who did nothing has */
  sentAt?: string;
  viewed: boolean;
  viewedAt?: string;
  response?: 'rsvp_confirm' | 'rsvp_decline';
  respondedAt?: string;
  /** What the guest entered on the RSVP form at the time they responded */
  guestCount?: number;
  /** Headcount on the guest record now - one record can cover a whole family */
  amount: number;
  /** Special Meals per type as answered at the time, e.g. { vegan: 1 } */
  mealCounts?: Record<string, number>;
};

export type ScheduleInteractionData = {
  summary: {
    /**
     * Guest records this schedule could actually be sent to. A record with no
     * usable phone number was never a recipient - the send engine files it as
     * `not_sent` before it ever reaches a channel - so counting it here made
     * the audience (and every rate read against it) look bigger than the send
     * ever was. Those records are excluded and reported as `excludedNoPhone`.
     */
    audience: number;
    reached: number;
    reachedWhatsapp: number;
    reachedSms: number;
    /** Of `reachedSms`, those reached by an SMS Fallback after WhatsApp could not */
    reachedByFallback: number;
    notReached: { onItsWay: number; notDelivered: number; noPhone: number };
    /** Targeted records left out of `audience` for want of a phone number */
    excludedNoPhone: number;
    /** Guest records with a WhatsApp read receipt */
    seen: number;
    /**
     * Deliveries that could ever produce a read receipt (WhatsApp, not failed
     * and not skipped). The denominator `seen` is honest against - counting it
     * out of the whole audience would score every SMS guest as unseen.
     */
    seenCapable: number;
    views: number;
    /** Guest records that confirmed */
    confirmed: number;
    /** People those records cover - the number that actually seats and bills */
    confirmedGuests: number;
    declined: number;
  };
  guests: GuestInteractionRow[];
};

function toOutcome(
  status: string | null,
  channel: string | null,
): GuestDeliveryOutcome {
  switch (status) {
    case 'delivered':
    case 'read':
      return channel === 'sms' ? 'sms' : 'whatsapp';
    case 'sent':
      return channel === 'sms' ? 'sms' : 'on_its_way';
    case 'failed':
      return 'not_delivered';
    case 'not_sent':
      return 'no_phone';
    default:
      // pending: reserved just before sending, the attempt not recorded yet
      return 'on_its_way';
  }
}

type AttemptRow = {
  channel: string;
  status: string;
  triggered_by: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
};

function toSteps(attempts: AttemptRow[] | null): GuestDeliveryStep[] {
  return (attempts ?? [])
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((attempt) => ({
      channel: attempt.channel === 'sms' ? 'sms' : 'whatsapp',
      fallback: attempt.triggered_by === 'fallback',
      sentAt: attempt.sent_at ?? undefined,
      deliveredAt: attempt.delivered_at ?? undefined,
      readAt: attempt.read_at ?? undefined,
      failedAt: attempt.status === 'failed' ? attempt.updated_at : undefined,
    }));
}

export async function getScheduleInteractionData(
  scheduleId: string,
): Promise<ScheduleInteractionData> {
  const { supabase } = await getEffectiveClient();

  const [interactionsResult, deliveriesResult] = await Promise.all([
    supabase
      .from('guest_interactions')
      .select(
        'interaction_type, created_at, metadata, guest_id, guests!inner(name, amount)',
      )
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: false }),
    supabase
      .from('message_deliveries')
      .select(
        'guest_id, status, sent_at, read_at, delivery_method, guests!inner(name, amount, phone_number), message_delivery_attempts(channel, status, triggered_by, sent_at, delivered_at, read_at, created_at, updated_at)',
      )
      .eq('schedule_id', scheduleId),
  ]);

  const empty: ScheduleInteractionData = {
    summary: {
      audience: 0,
      reached: 0,
      reachedWhatsapp: 0,
      reachedSms: 0,
      reachedByFallback: 0,
      notReached: { onItsWay: 0, notDelivered: 0, noPhone: 0 },
      excludedNoPhone: 0,
      seen: 0,
      seenCapable: 0,
      views: 0,
      confirmed: 0,
      confirmedGuests: 0,
      declined: 0,
    },
    guests: [],
  };

  if (interactionsResult.error || deliveriesResult.error) {
    console.error(
      'Error fetching schedule interaction data:',
      interactionsResult.error ?? deliveriesResult.error,
    );
    return empty;
  }

  const guestMap = new Map<string, GuestInteractionRow>();
  const rowFor = (
    guestId: string,
    guest: { name: string; amount: number | null },
  ) => {
    let entry = guestMap.get(guestId);
    if (!entry) {
      entry = {
        guestId,
        guestName: guest.name,
        steps: [],
        viaFallback: false,
        delivery: null,
        seen: false,
        viewed: false,
        amount: guest.amount ?? 1,
      };
      guestMap.set(guestId, entry);
    }
    return entry;
  };

  let seenCapable = 0;

  for (const row of deliveriesResult.data ?? []) {
    const guest = row.guests as unknown as {
      name: string;
      amount: number | null;
      phone_number: string | null;
    };
    const entry = rowFor(row.guest_id as string, guest);
    entry.delivery = toOutcome(row.status, row.delivery_method);
    entry.sentAt = (row.sent_at as string | null) ?? undefined;
    entry.phone = guest.phone_number ?? undefined;
    entry.steps = toSteps(row.message_delivery_attempts as AttemptRow[] | null);
    entry.viaFallback =
      entry.delivery === 'sms' &&
      entry.steps.some((step) => step.fallback && !step.failedAt);

    // `read` is the only status carrying a receipt, and only WhatsApp reports it.
    if (row.delivery_method === 'whatsapp') {
      if (row.status !== 'not_sent' && row.status !== 'failed') seenCapable++;
      if (row.status === 'read') {
        entry.seen = true;
        entry.seenAt = (row.read_at as string | null) ?? undefined;
      }
    }
  }

  for (const row of interactionsResult.data ?? []) {
    const guest = row.guests as unknown as {
      name: string;
      amount: number | null;
    };
    const entry = rowFor(row.guest_id as string, guest);
    const meta = row.metadata as {
      guestCount?: number;
      mealCounts?: Record<string, number>;
    } | null;

    if (row.interaction_type === 'view' && !entry.viewed) {
      entry.viewed = true;
      entry.viewedAt = row.created_at;
    } else if (
      (row.interaction_type === 'rsvp_confirm' ||
        row.interaction_type === 'rsvp_decline') &&
      !entry.response
    ) {
      entry.response = row.interaction_type as 'rsvp_confirm' | 'rsvp_decline';
      entry.respondedAt = row.created_at;
      entry.guestCount = meta?.guestCount;
      entry.mealCounts = meta?.mealCounts;
    }
  }

  const guests = Array.from(guestMap.values());
  const withDelivery = guests.filter((g) => g.delivery !== null);
  const count = (outcome: GuestDeliveryOutcome) =>
    withDelivery.filter((g) => g.delivery === outcome).length;
  const confirmedGuestRecords = guests.filter(
    (g) => g.response === 'rsvp_confirm',
  );

  const noPhone = count('no_phone');

  const summary = {
    audience: withDelivery.length - noPhone,
    reached: count('whatsapp') + count('sms'),
    reachedWhatsapp: count('whatsapp'),
    reachedSms: count('sms'),
    reachedByFallback: guests.filter((g) => g.viaFallback).length,
    notReached: {
      onItsWay: count('on_its_way'),
      notDelivered: count('not_delivered'),
      noPhone,
    },
    excludedNoPhone: noPhone,
    seen: guests.filter((g) => g.seen).length,
    seenCapable,
    views: guests.filter((g) => g.viewed).length,
    confirmed: confirmedGuestRecords.length,
    confirmedGuests: confirmedGuestRecords.reduce(
      (sum, g) => sum + g.amount,
      0,
    ),
    declined: guests.filter((g) => g.response === 'rsvp_decline').length,
  };

  // Responded first, then viewed, then seen, then reached, then not reached
  guests.sort((a, b) => {
    const rank = (g: GuestInteractionRow) =>
      g.response
        ? 0
        : g.viewed
          ? 1
          : g.seen
            ? 2
            : g.delivery === 'whatsapp' || g.delivery === 'sms'
              ? 3
              : 4;
    return rank(a) - rank(b);
  });

  return { summary, guests };
}
