import type { SupabaseClient } from '@supabase/supabase-js';
import { renderScheduleDeliveries } from './render-deliveries';
import { chunks } from './deliveries';
import {
  HOUR_MS,
  MARKETING_CAP_CODES,
  MARKETING_CAP_RETRY_LOOKBACK_HOURS,
  deliveryMarketingCapHold,
  marketingCapRetryWindow,
  scheduleFactsFrom,
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
 * Nothing is stored about the retries. Which rung a Delivery is on and when it
 * is due are read off its attempts by `deliveryMarketingCapHold`, the same rule
 * the SMS sweeper's hold and the Owner's results read.
 */

const TAG = '[marketing-cap-retry]';

export type MarketingCapRetrySweep = {
  /** Deliveries awaiting a retry, due or not. Not counted while the retry window is shut. */
  awaiting: number;
  queued: number;
  /**
   * Due, but nothing was queued: the render or the write failed, or the Guest
   * Record rendered nothing (gone, or outside the Record Package). Tried again
   * by the next sweeps until the retry's grace runs out and the SMS Fallback
   * takes it.
   */
  failed: number;
};

type CandidateRow = {
  id: string;
  schedule_id: string;
  guest_id: string;
  status: string;
  next_attempt_at: string | null;
  guests: { rsvp_status: string | null; rsvp_changed_at: string | null } | null;
  schedules: {
    schedule_types: { key: string } | null;
    events: { event_date: string | null } | null;
  } | null;
  message_delivery_attempts: MarketingCapAttempt[];
};

export async function queueMarketingCapRetries(
  supabase: SupabaseClient,
  options: { now?: Date } = {},
): Promise<MarketingCapRetrySweep> {
  const now = options.now ?? new Date();
  const result: MarketingCapRetrySweep = { awaiting: 0, queued: 0, failed: 0 };
  const { sendWindow } = sendingConfig();

  // A retry is queued only while the retry window - the Send Window closing a
  // margin early - is open, so one queued now cannot reach a phone after it
  // shuts. One due overnight simply waits for the first sweep after it opens,
  // and the sweeps in between have nothing to do.
  if (!isWithinSendWindow(now, marketingCapRetryWindow(sendWindow))) return result;

  const since = new Date(now.getTime() - MARKETING_CAP_RETRY_LOOKBACK_HOURS * HOUR_MS);
  const { data: failures, error: failuresError } = await supabase
    .from('message_delivery_attempts')
    .select('delivery_id')
    .eq('channel', 'whatsapp')
    .eq('status', 'failed')
    .in('error_code', [...MARKETING_CAP_CODES])
    .gte('created_at', since.toISOString())
    .limit(2_000);
  if (failuresError) {
    console.error(`${TAG} Could not find marketing-cap failures:`, failuresError);
    return result;
  }

  const deliveryIds = [...new Set((failures ?? []).map((row) => row.delivery_id as string))];
  if (deliveryIds.length === 0) return result;

  const due = new Map<string, { deliveryId: string; guestId: string }[]>();
  for (const ids of chunks(deliveryIds)) {
    const { data, error } = await supabase
      .from('message_deliveries')
      .select(
        'id, schedule_id, guest_id, status, next_attempt_at, guests(rsvp_status, rsvp_changed_at), schedules(schedule_types(key), events(event_date)), message_delivery_attempts(channel, status, error_code, created_at)',
      )
      .in('id', ids);
    if (error) {
      console.error(`${TAG} Could not load deliveries:`, error);
      return result;
    }

    for (const row of (data ?? []) as unknown as CandidateRow[]) {
      const retry = deliveryMarketingCapHold(row, scheduleFactsFrom(row.schedules), sendWindow, now);
      if (retry?.kind !== 'awaiting_retry') continue;
      result.awaiting += 1;
      // Already queued (by an earlier sweep or an Operator's resend) or being
      // sent: the queue has it.
      if (retry.inFlight || row.next_attempt_at !== null) continue;
      if (retry.dueAt.getTime() > now.getTime()) continue;

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
    await Promise.all(
      render.rendered
        .filter((item) => wanted.has(item.deliveryId))
        .map(async (item) => {
          // Guarded on still being unqueued, so a resend an Operator pressed in
          // the meantime keeps its own payload and is not sent twice.
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
            return;
          }
          if ((written ?? []).length > 0) queuedHere.add(item.deliveryId);
        }),
    );

    result.queued += queuedHere.size;
    // Rendered nothing for a Delivery: its Guest Record is gone or outside the
    // Record Package. The retry's grace hands such a one to the SMS Fallback
    // within the hour, and the Owner is no longer told a WhatsApp is coming.
    result.failed += [...wanted].filter((id) => !queuedHere.has(id)).length;
  }

  if (result.awaiting > 0) {
    console.log(
      `${TAG} ${result.awaiting} awaiting, ${result.queued} queued, ${result.failed} not queued`,
    );
  }
  return result;
}
