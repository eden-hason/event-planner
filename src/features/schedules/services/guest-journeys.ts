import type { SupabaseClient } from '@supabase/supabase-js';
import {
  toDeliveryOutcome,
  toDeliverySteps,
  type DeliveryAttemptRow,
  type GuestInteractionRow,
} from '../utils/delivery-outcome';
import {
  awaitingSmsFallback,
  stuckWindow,
  type FallbackDeliveryRow,
} from './send-sms-fallback';
import { scheduleFreeze } from './sweep-sms-fallback';

/** One guest's Delivery for one Schedule: its Journey, and the queue facts a catch-up reads */
export type GuestJourney = {
  scheduleId: string;
  status: string;
  queued: boolean;
  attemptPending: boolean;
  notSentReason: string | null;
  journey: GuestInteractionRow;
};

const ATTEMPTS =
  'channel, status, error_code, triggered_by, sent_at, delivered_at, read_at, created_at, updated_at';

/**
 * Every Delivery one Guest Record has, each read the way the Schedule Results
 * tab reads its row for that guest - so the guest drawer and the results never
 * tell the Owner two different stories about the same message.
 *
 * The one Schedule-wide fact in a row is whether an SMS Fallback is on its way,
 * which waits on the Schedule's Fallback Freeze. It is asked only for a
 * Delivery that failed, which is the only kind it can change.
 */
export async function loadGuestJourneys(
  supabase: SupabaseClient,
  guestId: string,
): Promise<GuestJourney[] | null> {
  const [guestResult, deliveriesResult, answersResult] = await Promise.all([
    supabase
      .from('guests')
      .select('name, amount, phone_number')
      .eq('id', guestId)
      .maybeSingle(),
    supabase
      .from('message_deliveries')
      .select(
        `id, schedule_id, status, not_sent_reason, sent_at, read_at, delivery_method, next_attempt_at, message_delivery_attempts(${ATTEMPTS})`,
      )
      .eq('guest_id', guestId),
    supabase
      .from('guest_interactions')
      .select('interaction_type, created_at, metadata, schedule_id')
      .eq('guest_id', guestId)
      .in('interaction_type', ['rsvp_confirm', 'rsvp_decline'])
      .order('created_at', { ascending: false }),
  ]);

  const failed =
    guestResult.error ?? deliveriesResult.error ?? answersResult.error;
  if (failed) {
    console.error('Error fetching guest journeys:', failed);
    return null;
  }
  const guest = guestResult.data;
  if (!guest) return null;

  // The latest answer each Schedule drew out, as the results tab shows it.
  const answers = new Map<
    string,
    { type: string; at: string; count?: number; meals?: Record<string, number> }
  >();
  for (const row of answersResult.data ?? []) {
    if (!row.schedule_id || answers.has(row.schedule_id)) continue;
    const meta = row.metadata as {
      guestCount?: number;
      mealCounts?: Record<string, number>;
    } | null;
    answers.set(row.schedule_id, {
      type: row.interaction_type,
      at: row.created_at,
      count: meta?.guestCount,
      meals: meta?.mealCounts,
    });
  }

  const journeys: GuestJourney[] = [];
  for (const row of deliveriesResult.data ?? []) {
    const attempts =
      (row.message_delivery_attempts as DeliveryAttemptRow[] | null) ?? [];
    const scheduleId = row.schedule_id as string;

    let smsOnItsWay = false;
    if (row.status === 'failed') {
      const { data: scheduleAttempts } = await supabase
        .from('message_delivery_attempts')
        .select(
          'channel, status, error_code, message_deliveries!inner(schedule_id)',
        )
        .eq('message_deliveries.schedule_id', scheduleId);
      const fallbackRow = {
        id: row.id as string,
        status: row.status,
        guest_id: guestId,
        confirmation_token: null,
        guests: { name: guest.name, phone_number: guest.phone_number },
        message_delivery_attempts: attempts.map((attempt) => ({
          channel: attempt.channel,
          status: attempt.status,
          error_code: attempt.error_code,
          error_message: null,
          sent_at: attempt.sent_at,
          created_at: attempt.created_at,
        })),
      } as FallbackDeliveryRow;
      smsOnItsWay = awaitingSmsFallback([fallbackRow], {
        frozen: scheduleFreeze(scheduleAttempts ?? []).frozen,
        window: stuckWindow(),
      }).has(row.id as string);
    }

    const delivery = smsOnItsWay
      ? 'sms_on_its_way'
      : toDeliveryOutcome(
          row.status,
          row.delivery_method,
          row.not_sent_reason ?? null,
        );
    const steps = toDeliverySteps(attempts);
    const answer = answers.get(scheduleId);
    const read = row.delivery_method === 'whatsapp' && row.status === 'read';
    // A guest who answered opened the message, receipt or not - the same rule
    // the results tab applies to WhatsApp guests with read receipts turned off.
    const seenCapable =
      row.delivery_method === 'whatsapp' &&
      row.status !== 'not_sent' &&
      row.status !== 'failed';

    journeys.push({
      scheduleId,
      status: row.status,
      queued: row.next_attempt_at !== null,
      attemptPending: attempts.some((attempt) => attempt.status === 'pending'),
      notSentReason: row.not_sent_reason ?? null,
      journey: {
        guestId,
        guestName: guest.name,
        phone: guest.phone_number ?? undefined,
        steps,
        viaFallback:
          delivery === 'sms' &&
          steps.some((step) => step.fallback && !step.failedAt),
        delivery,
        seen: read || (seenCapable && !!answer),
        seenAt: read ? (row.read_at ?? undefined) : undefined,
        sentAt: row.sent_at ?? undefined,
        response: answer?.type as GuestInteractionRow['response'],
        respondedAt: answer?.at,
        guestCount: answer?.count,
        amount: guest.amount ?? 1,
        mealCounts: answer?.meals,
      },
    });
  }
  return journeys;
}
