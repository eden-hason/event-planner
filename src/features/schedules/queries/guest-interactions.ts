'use server';

import { getEffectiveClient } from '@/lib/supabase/admin';
import {
  toDeliveryOutcome,
  toDeliverySteps,
  toFallbackRow,
  type DeliveryAttemptRow,
  type GuestDeliveryOutcome,
  type GuestInteractionRow,
} from '../utils/delivery-outcome';
import { awaitingSmsFallback, stuckWindow } from '../services/send-sms-fallback';
import { scheduleFreeze } from '../services/sweep-sms-fallback';

export type {
  GuestDeliveryOutcome,
  GuestDeliveryStep,
  GuestInteractionRow,
} from '../utils/delivery-outcome';

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
    notReached: {
      onItsWay: number;
      smsOnItsWay: number;
      notDelivered: number;
      noPhone: number;
      outsidePackage: number;
    };
    /** Targeted records left out of `audience` for want of a phone number */
    excludedNoPhone: number;
    /** Targeted records left out of `audience` because they were outside the package */
    excludedOutsidePackage: number;
    /** Guest records with a WhatsApp read receipt */
    seen: number;
    /**
     * Deliveries that could ever produce a read receipt (WhatsApp, not failed
     * and not skipped). The denominator `seen` is honest against - counting it
     * out of the whole audience would score every SMS guest as unseen.
     */
    seenCapable: number;
    /** Guest records that confirmed */
    confirmed: number;
    /** People those records cover - the number that actually seats and bills */
    confirmedGuests: number;
    declined: number;
  };
  guests: GuestInteractionRow[];
};

/** An Event under an SMS Fallback Opt-out, read off an embedded `events` row. */
function smsFallbackOptedOut(row: { events: unknown } | null): boolean {
  const event = row?.events as { sms_fallback_enabled?: boolean } | null | undefined;
  return event?.sms_fallback_enabled === false;
}

export async function getScheduleInteractionData(
  scheduleId: string,
): Promise<ScheduleInteractionData> {
  const { supabase } = await getEffectiveClient();

  const [interactionsResult, deliveriesResult, eventResult] = await Promise.all([
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
        'id, guest_id, status, not_sent_reason, sent_at, read_at, delivery_method, guests!inner(name, amount, phone_number), message_delivery_attempts(channel, status, error_code, triggered_by, sent_at, delivered_at, read_at, created_at, updated_at)',
      )
      .eq('schedule_id', scheduleId),
    supabase
      .from('schedules')
      .select('events!inner(sms_fallback_enabled)')
      .eq('id', scheduleId)
      .maybeSingle(),
  ]);

  const empty: ScheduleInteractionData = {
    summary: {
      audience: 0,
      reached: 0,
      reachedWhatsapp: 0,
      reachedSms: 0,
      reachedByFallback: 0,
      notReached: {
        onItsWay: 0,
        smsOnItsWay: 0,
        notDelivered: 0,
        noPhone: 0,
        outsidePackage: 0,
      },
      excludedNoPhone: 0,
      excludedOutsidePackage: 0,
      seen: 0,
      seenCapable: 0,
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
        amount: guest.amount ?? 1,
      };
      guestMap.set(guestId, entry);
    }
    return entry;
  };

  let seenCapable = 0;
  const seenCapableIds = new Set<string>();

  const deliveryRows = deliveriesResult.data ?? [];
  const smsComing = awaitingSmsFallback(
    deliveryRows.map((row) =>
      toFallbackRow(
        { id: row.id as string, status: row.status, guest_id: row.guest_id as string },
        row.guests as unknown as { name: string; phone_number: string | null },
        (row.message_delivery_attempts as DeliveryAttemptRow[] | null) ?? [],
      ),
    ),
    {
      frozen: scheduleFreeze(
        deliveryRows.flatMap(
          (row) => (row.message_delivery_attempts as DeliveryAttemptRow[] | null) ?? [],
        ),
      ).frozen,
      optedOut: smsFallbackOptedOut(eventResult.data),
      window: stuckWindow(),
    },
  );

  for (const row of deliveryRows) {
    const guest = row.guests as unknown as {
      name: string;
      amount: number | null;
      phone_number: string | null;
    };
    const entry = rowFor(row.guest_id as string, guest);
    entry.delivery = smsComing.has(row.id as string)
      ? 'sms_on_its_way'
      : toDeliveryOutcome(
          row.status,
          row.delivery_method,
          (row.not_sent_reason as string | null) ?? null,
        );
    entry.sentAt = (row.sent_at as string | null) ?? undefined;
    entry.phone = guest.phone_number ?? undefined;
    entry.steps = toDeliverySteps(row.message_delivery_attempts as DeliveryAttemptRow[] | null);
    entry.viaFallback =
      entry.delivery === 'sms' &&
      entry.steps.some((step) => step.fallback && !step.failedAt);

    // `read` is the only status carrying a receipt, and only WhatsApp reports it.
    if (row.delivery_method === 'whatsapp') {
      if (row.status !== 'not_sent' && row.status !== 'failed') {
        seenCapable++;
        seenCapableIds.add(entry.guestId);
      }
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

    if (
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

  // A guest who answered opened the message, receipt or not: WhatsApp sends no
  // read status for anyone with Read receipts turned off in their privacy
  // settings. Left unseen, the table showed confirmed guests as never having
  // read the invitation. `seenAt` stays empty - there is no read time to show.
  for (const guestId of seenCapableIds) {
    const entry = guestMap.get(guestId);
    if (entry?.response && !entry.seen) entry.seen = true;
  }

  const guests = Array.from(guestMap.values());
  const withDelivery = guests.filter((g) => g.delivery !== null);
  const count = (outcome: GuestDeliveryOutcome) =>
    withDelivery.filter((g) => g.delivery === outcome).length;
  const confirmedGuestRecords = guests.filter(
    (g) => g.response === 'rsvp_confirm',
  );

  const noPhone = count('no_phone');
  const outsidePackage = count('outside_package');

  const summary = {
    audience: withDelivery.length - noPhone - outsidePackage,
    reached: count('whatsapp') + count('sms'),
    reachedWhatsapp: count('whatsapp'),
    reachedSms: count('sms'),
    reachedByFallback: guests.filter((g) => g.viaFallback).length,
    notReached: {
      onItsWay: count('on_its_way'),
      smsOnItsWay: count('sms_on_its_way'),
      notDelivered: count('not_delivered'),
      noPhone,
      outsidePackage,
    },
    excludedNoPhone: noPhone,
    excludedOutsidePackage: outsidePackage,
    seen: guests.filter((g) => g.seen).length,
    seenCapable,
    confirmed: confirmedGuestRecords.length,
    confirmedGuests: confirmedGuestRecords.reduce(
      (sum, g) => sum + g.amount,
      0,
    ),
    declined: guests.filter((g) => g.response === 'rsvp_decline').length,
  };

  // Responded first, then seen, then reached, then not reached
  guests.sort((a, b) => {
    const rank = (g: GuestInteractionRow) =>
      g.response
        ? 0
        : g.seen
          ? 1
          : g.delivery === 'whatsapp' || g.delivery === 'sms'
            ? 2
            : 3;
    return rank(a) - rank(b);
  });

  return { summary, guests };
}
