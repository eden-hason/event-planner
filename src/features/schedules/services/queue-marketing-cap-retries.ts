import type { SupabaseClient } from '@supabase/supabase-js';
import { renderScheduleDeliveries } from './render-deliveries';
import {
  MARKETING_CAP_RETRY_MAX_HOURS,
  marketingCapRetry,
  type MarketingCapAttempt,
} from '../utils/marketing-cap-retry';
import { isWithinSendWindow } from '../utils/send-window';
import { sendingConfig } from '@/lib/config/sending';

/**
 * Queues the Marketing Cap Retries that have come due (ADR 0056).
 *
 * A marketing-cap failure arrives through the webhook after Meta accepted the
 * send, and by then the Worker has dropped the Delivery's `send_payload` - it
 * holds the Guest's number and exists only while a Delivery is in flight. So a
 * retry cannot simply be re-queued: it is re-rendered here, through the same
 * renderer an Operator's resend uses, and handed to the queue. The Worker then
 * claims and sends it like any other queued Delivery, recorded as `scheduled`.
 *
 * Nothing is stored about the ladder. Which rung a Delivery is on and when it is
 * due are read off its attempts by `marketingCapRetry`, the same rule the SMS
 * sweeper's hold and the Owner's results read.
 */

const TAG = '[marketing-cap-retry]';

/** Delivery ids per lookup, to keep the `in` filter well inside URL limits. */
const LOOKUP_CHUNK = 200;

export type MarketingCapRetrySweep = {
  /** Deliveries awaiting a retry, due or not */
  awaiting: number;
  queued: number;
  /** Due, but the render or the queue write did not go through; tried again next sweep */
  failed: number;
};

type CandidateRow = {
  id: string;
  schedule_id: string;
  guest_id: string;
  status: string;
  next_attempt_at: string | null;
  guests: { rsvp_status: string | null } | null;
  schedules: { schedule_types: { key: string } | null } | null;
  message_delivery_attempts: MarketingCapAttempt[];
};

export async function queueMarketingCapRetries(
  supabase: SupabaseClient,
  options: { now?: Date } = {},
): Promise<MarketingCapRetrySweep> {
  const now = options.now ?? new Date();
  const result: MarketingCapRetrySweep = { awaiting: 0, queued: 0, failed: 0 };
  const { sendWindow } = sendingConfig();

  // A retry is never queued while the Send Window is shut. One due overnight
  // simply waits for the first sweep after it opens.
  const windowOpen = isWithinSendWindow(now, sendWindow);

  const since = new Date(now.getTime() - MARKETING_CAP_RETRY_MAX_HOURS * 3_600_000);
  const { data: failures, error: failuresError } = await supabase
    .from('message_delivery_attempts')
    .select('delivery_id')
    .eq('channel', 'whatsapp')
    .eq('status', 'failed')
    .in('error_code', [131049, 130472])
    .gte('created_at', since.toISOString())
    .limit(2_000);
  if (failuresError) {
    console.error(`${TAG} Could not find marketing-cap failures:`, failuresError);
    return result;
  }

  const deliveryIds = [...new Set((failures ?? []).map((row) => row.delivery_id as string))];
  if (deliveryIds.length === 0) return result;

  const due = new Map<string, { deliveryId: string; guestId: string }[]>();
  for (let i = 0; i < deliveryIds.length; i += LOOKUP_CHUNK) {
    const { data, error } = await supabase
      .from('message_deliveries')
      .select(
        'id, schedule_id, guest_id, status, next_attempt_at, guests(rsvp_status), schedules(schedule_types(key)), message_delivery_attempts(channel, status, error_code, created_at)',
      )
      .in('id', deliveryIds.slice(i, i + LOOKUP_CHUNK));
    if (error) {
      console.error(`${TAG} Could not load deliveries:`, error);
      return result;
    }

    for (const row of (data ?? []) as unknown as CandidateRow[]) {
      const retry = marketingCapRetry({
        scheduleTypeKey: row.schedules?.schedule_types?.key,
        rsvpStatus: row.guests?.rsvp_status,
        attempts: row.message_delivery_attempts,
        sendWindow,
        now,
      });
      if (!retry) continue;
      result.awaiting += 1;
      // Already queued (by an earlier sweep or an Operator's resend) or being
      // sent: the queue has it.
      if (retry.inFlight || row.next_attempt_at !== null) continue;
      if (!windowOpen || retry.dueAt.getTime() > now.getTime()) continue;

      const list = due.get(row.schedule_id) ?? [];
      list.push({ deliveryId: row.id, guestId: row.guest_id });
      due.set(row.schedule_id, list);
    }
  }

  for (const [scheduleId, deliveries] of due) {
    // A render that throws must not stop the sweep: the SMS Fallback runs next.
    const render = await renderScheduleDeliveries(supabase, scheduleId, {
      guestIds: deliveries.map((d) => d.guestId),
    }).catch((error: unknown) => ({
      ok: false as const,
      reason: error instanceof Error ? error.message : 'render threw',
    }));
    if (!render.ok) {
      console.error(`${TAG} Could not render schedule ${scheduleId}: ${render.reason}`);
      result.failed += deliveries.length;
      continue;
    }

    const wanted = new Set(deliveries.map((d) => d.deliveryId));
    const queuedHere = new Set<string>();
    for (const item of render.rendered) {
      if (!wanted.has(item.deliveryId)) continue;
      // Guarded on still being unqueued, so a resend an Operator pressed in the
      // meantime keeps its own payload and is not sent twice.
      const { data: written, error } = await supabase
        .from('message_deliveries')
        .update({
          template_id: item.templateId,
          send_payload: item.payload,
          next_attempt_at: now.toISOString(),
        })
        .eq('id', item.deliveryId)
        .is('next_attempt_at', null)
        .select('id');
      if (error) {
        console.error(`${TAG} Could not queue delivery ${item.deliveryId}:`, error);
        continue;
      }
      if ((written ?? []).length > 0) queuedHere.add(item.deliveryId);
    }

    result.queued += queuedHere.size;
    // Rendered nothing for a Delivery: its Guest Record is gone or outside the
    // Record Package. The 48-hour ceiling hands such a one to the SMS Fallback.
    result.failed += [...wanted].filter((id) => !queuedHere.has(id)).length;
  }

  if (result.awaiting > 0) {
    console.log(
      `${TAG} ${result.awaiting} awaiting, ${result.queued} queued, ${result.failed} not queued` +
        (windowOpen ? '' : ' (Send Window closed)'),
    );
  }
  return result;
}
