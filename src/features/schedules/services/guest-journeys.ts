import type { SupabaseClient } from '@supabase/supabase-js';
import {
  toDeliveryOutcome,
  toDeliverySteps,
  toFallbackRow,
  type DeliveryAttemptRow,
  type GuestInteractionRow,
} from '../utils/delivery-outcome';
import { awaitingSmsFallback, stuckWindow } from './send-sms-fallback';
import { scheduleFreeze } from './sweep-sms-fallback';

/** One guest's Delivery for one Schedule: its Journey, and the queue facts a catch-up reads */
export type GuestJourneyDelivery = {
  scheduleId: string;
  status: string;
  queued: boolean;
  attemptPending: boolean;
  notSentReason: string | null;
  journey: GuestInteractionRow;
};

/** An RSVP the Guest gave themselves, newest first, with where they gave it */
export type GuestAnswer = { channel: string | null; at: string };

const ATTEMPTS =
  'channel, status, error_code, triggered_by, sent_at, delivered_at, read_at, created_at, updated_at';

/**
 * Every Delivery one Guest Record has, each read the way the Schedule Results
 * tab reads its row for that guest - so the guest drawer and the results never
 * tell the Owner two different stories about the same message - and the RSVP
 * answers the guest gave, which those rows end in.
 *
 * The one Schedule-wide fact in a row is whether an SMS Fallback is on its way,
 * which waits on the Schedule's Fallback Freeze. It is asked only for the
 * Schedules where this guest's Delivery failed, the only kind it can change.
 */
export async function loadGuestJourneys(
  supabase: SupabaseClient,
  guest: { id: string; name: string; amount: number; phone: string | null },
): Promise<{ deliveries: GuestJourneyDelivery[]; answers: GuestAnswer[] } | null> {
  const [deliveriesResult, answersResult] = await Promise.all([
    supabase
      .from('message_deliveries')
      .select(
        `id, schedule_id, status, not_sent_reason, sent_at, read_at, delivery_method, next_attempt_at, message_delivery_attempts(${ATTEMPTS})`,
      )
      .eq('guest_id', guest.id),
    supabase
      .from('guest_interactions')
      .select('interaction_type, created_at, metadata, schedule_id')
      .eq('guest_id', guest.id)
      .in('interaction_type', ['rsvp_confirm', 'rsvp_decline'])
      .order('created_at', { ascending: false }),
  ]);

  const failed = deliveriesResult.error ?? answersResult.error;
  if (failed) {
    console.error('Error fetching guest journeys:', failed);
    return null;
  }
  const rows = deliveriesResult.data ?? [];

  // The latest answer each Schedule drew out, as the results tab shows it.
  const answers: GuestAnswer[] = [];
  const answerBySchedule = new Map<
    string,
    { type: string; at: string; count?: number; meals?: Record<string, number> }
  >();
  for (const row of answersResult.data ?? []) {
    const meta = row.metadata as {
      channel?: unknown;
      guestCount?: number;
      mealCounts?: Record<string, number>;
    } | null;
    answers.push({
      channel: typeof meta?.channel === 'string' ? meta.channel : null,
      at: row.created_at,
    });
    if (!row.schedule_id || answerBySchedule.has(row.schedule_id)) continue;
    answerBySchedule.set(row.schedule_id, {
      type: row.interaction_type,
      at: row.created_at,
      count: meta?.guestCount,
      meals: meta?.mealCounts,
    });
  }

  // Each Schedule's Freeze once, all at the same time.
  const failedSchedules = [
    ...new Set(
      rows.filter((row) => row.status === 'failed').map((row) => row.schedule_id as string),
    ),
  ];
  const frozen = new Map(
    await Promise.all(
      failedSchedules.map(async (scheduleId) => {
        const { data } = await supabase
          .from('message_delivery_attempts')
          .select('channel, status, error_code, message_deliveries!inner(schedule_id)')
          .eq('message_deliveries.schedule_id', scheduleId);
        return [scheduleId, scheduleFreeze(data ?? []).frozen] as const;
      }),
    ),
  );

  const owner = { name: guest.name, phone_number: guest.phone };
  const deliveries = rows.map((row): GuestJourneyDelivery => {
    const attempts = (row.message_delivery_attempts as DeliveryAttemptRow[] | null) ?? [];
    const scheduleId = row.schedule_id as string;
    const id = row.id as string;

    const smsOnItsWay =
      row.status === 'failed' &&
      awaitingSmsFallback([toFallbackRow({ id, status: row.status, guest_id: guest.id }, owner, attempts)], {
        frozen: frozen.get(scheduleId) ?? false,
        window: stuckWindow(),
      }).has(id);

    const delivery = smsOnItsWay
      ? 'sms_on_its_way'
      : toDeliveryOutcome(row.status, row.delivery_method, row.not_sent_reason ?? null);
    const steps = toDeliverySteps(attempts);
    const answer = answerBySchedule.get(scheduleId);
    const read = row.delivery_method === 'whatsapp' && row.status === 'read';
    // A guest who answered opened the message, receipt or not - the same rule
    // the results tab applies to WhatsApp guests with read receipts turned off.
    const seenCapable =
      row.delivery_method === 'whatsapp' && row.status !== 'not_sent' && row.status !== 'failed';

    return {
      scheduleId,
      status: row.status,
      queued: row.next_attempt_at !== null,
      attemptPending: attempts.some((attempt) => attempt.status === 'pending'),
      notSentReason: row.not_sent_reason ?? null,
      journey: {
        guestId: guest.id,
        guestName: guest.name,
        phone: guest.phone ?? undefined,
        steps,
        viaFallback: delivery === 'sms' && steps.some((step) => step.fallback && !step.failedAt),
        delivery,
        seen: read || (seenCapable && !!answer),
        seenAt: read ? (row.read_at ?? undefined) : undefined,
        sentAt: row.sent_at ?? undefined,
        response: answer?.type as GuestInteractionRow['response'],
        respondedAt: answer?.at,
        guestCount: answer?.count,
        amount: guest.amount,
        mealCounts: answer?.meals,
      },
    };
  });

  return { deliveries, answers };
}
