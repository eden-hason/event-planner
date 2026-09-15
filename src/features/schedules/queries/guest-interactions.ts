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

export type GuestInteractionRow = {
  guestId: string;
  guestName: string;
  /** Null for a guest who interacted but has no delivery record (a shared link) */
  delivery: GuestDeliveryOutcome | null;
  viewed: boolean;
  viewedAt?: string;
  response?: 'rsvp_confirm' | 'rsvp_decline';
  respondedAt?: string;
  /** What the guest entered on the RSVP form at the time they responded */
  guestCount?: number;
  /** Headcount on the guest record now - one record can cover a whole family */
  amount: number;
  mealChoice?: string;
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
    notReached: { onItsWay: number; notDelivered: number; noPhone: number };
    /** Targeted records left out of `audience` for want of a phone number */
    excludedNoPhone: number;
    views: number;
    /** Guest records that confirmed */
    confirmed: number;
    /** People those records cover - the number that actually seats and bills */
    confirmedGuests: number;
    declined: number;
  };
  guests: GuestInteractionRow[];
};

function toOutcome(status: string | null, channel: string | null): GuestDeliveryOutcome {
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

export async function getScheduleInteractionData(
  scheduleId: string,
): Promise<ScheduleInteractionData> {
  const { supabase } = await getEffectiveClient();

  const [interactionsResult, deliveriesResult] = await Promise.all([
    supabase
      .from('guest_interactions')
      .select('interaction_type, created_at, metadata, guest_id, guests!inner(name, amount)')
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: false }),
    supabase
      .from('message_deliveries')
      .select('guest_id, status, delivery_method, guests!inner(name, amount)')
      .eq('schedule_id', scheduleId),
  ]);

  const empty: ScheduleInteractionData = {
    summary: {
      audience: 0,
      reached: 0,
      reachedWhatsapp: 0,
      reachedSms: 0,
      notReached: { onItsWay: 0, notDelivered: 0, noPhone: 0 },
      excludedNoPhone: 0,
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
  const rowFor = (guestId: string, guest: { name: string; amount: number | null }) => {
    let entry = guestMap.get(guestId);
    if (!entry) {
      entry = {
        guestId,
        guestName: guest.name,
        delivery: null,
        viewed: false,
        amount: guest.amount ?? 1,
      };
      guestMap.set(guestId, entry);
    }
    return entry;
  };

  for (const row of deliveriesResult.data ?? []) {
    const guest = row.guests as unknown as { name: string; amount: number | null };
    rowFor(row.guest_id as string, guest).delivery = toOutcome(row.status, row.delivery_method);
  }

  for (const row of interactionsResult.data ?? []) {
    const guest = row.guests as unknown as { name: string; amount: number | null };
    const entry = rowFor(row.guest_id as string, guest);
    const meta = row.metadata as { guestCount?: number; mealChoice?: string } | null;

    if (row.interaction_type === 'view' && !entry.viewed) {
      entry.viewed = true;
      entry.viewedAt = row.created_at;
    } else if (
      (row.interaction_type === 'rsvp_confirm' || row.interaction_type === 'rsvp_decline') &&
      !entry.response
    ) {
      entry.response = row.interaction_type as 'rsvp_confirm' | 'rsvp_decline';
      entry.respondedAt = row.created_at;
      entry.guestCount = meta?.guestCount;
      entry.mealChoice = meta?.mealChoice;
    }
  }

  const guests = Array.from(guestMap.values());
  const withDelivery = guests.filter((g) => g.delivery !== null);
  const count = (outcome: GuestDeliveryOutcome) =>
    withDelivery.filter((g) => g.delivery === outcome).length;
  const confirmedGuestRecords = guests.filter((g) => g.response === 'rsvp_confirm');

  const noPhone = count('no_phone');

  const summary = {
    audience: withDelivery.length - noPhone,
    reached: count('whatsapp') + count('sms'),
    reachedWhatsapp: count('whatsapp'),
    reachedSms: count('sms'),
    notReached: {
      onItsWay: count('on_its_way'),
      notDelivered: count('not_delivered'),
      noPhone,
    },
    excludedNoPhone: noPhone,
    views: guests.filter((g) => g.viewed).length,
    confirmed: confirmedGuestRecords.length,
    confirmedGuests: confirmedGuestRecords.reduce((sum, g) => sum + g.amount, 0),
    declined: guests.filter((g) => g.response === 'rsvp_decline').length,
  };

  // Responded first, then viewed, then reached, then everyone not reached
  guests.sort((a, b) => {
    const rank = (g: GuestInteractionRow) =>
      g.response ? 0
        : g.viewed ? 1
          : g.delivery === 'whatsapp' || g.delivery === 'sms' ? 2
            : 3;
    return rank(a) - rank(b);
  });

  return { summary, guests };
}
