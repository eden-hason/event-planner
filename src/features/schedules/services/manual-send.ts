import type { SupabaseClient } from '@supabase/supabase-js';
import { dispatchScheduleById } from './dispatch-schedules';
import { postWhatsAppTemplate } from '../actions/whatsapp';
import { sendSmsMessage } from '../actions/sms';
import { parseSendPayload, type SendPayload } from '../utils/send-payload';

/**
 * An Operator's send to a handful of named Guests.
 *
 * The important part is what it does *not* do: it does not build its own
 * messages and it does not send outside the claim protocol. It re-dispatches
 * the Schedule so the Dispatcher renders fresh payloads onto the chosen
 * Deliveries, then claims each one exactly as the Worker would, through
 * `claim_delivery_batch`.
 *
 * That claim is the only thing stopping an Operator and the Worker sending to
 * the same Guest at once (ADR 0014). An Operator pressing this while a drain is
 * running is not a hypothetical - it is what an Operator does when a send looks
 * stuck - and without a shared claim both would post to Meta with no way to
 * tell afterwards that the guest got two invitations.
 *
 * Synchronous and outside the governor, which is only defensible because it is
 * capped at ten: the overshoot stays under Meta's ceiling.
 */

export type ManualSendOutcome = {
  success: boolean;
  message: string;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
};

async function postOne(payload: SendPayload): Promise<{ ok: boolean; messageId: string | null; error: string | null; code: number | null }> {
  if (payload.channel === 'sms') {
    const result = await sendSmsMessage({ to: payload.to, body: payload.body });
    return {
      ok: result.success,
      messageId: result.messageId ?? null,
      error: result.success ? null : result.message,
      code: null,
    };
  }

  const result = await postWhatsAppTemplate(payload);
  if (result.outcome === 'accepted') {
    return { ok: true, messageId: result.messageId, error: null, code: null };
  }
  return {
    ok: false,
    messageId: null,
    error: result.message,
    // An unknown outcome carries no code, which keeps it System-level and out
    // of any automatic SMS to a guest who may already have the message.
    code: result.outcome === 'rejected' ? result.errorCode : null,
  };
}

export async function sendSelectedDeliveries(
  supabase: SupabaseClient,
  scheduleId: string,
  guestIds: string[],
): Promise<ManualSendOutcome> {
  const empty = { sentCount: 0, failedCount: 0, skippedCount: 0 };

  // Only Deliveries that already belong to this Schedule. An Operator picks
  // from the Schedule's own list, so anything else is a stale page or a
  // tampered request.
  const { data: deliveries, error } = await supabase
    .from('message_deliveries')
    .select('id, guest_id')
    .eq('schedule_id', scheduleId)
    .in('guest_id', guestIds);
  if (error) {
    return { success: false, message: 'Could not load those deliveries', ...empty };
  }
  const deliveryIds = (deliveries ?? []).map((row: { id: string }) => row.id);
  if (deliveryIds.length !== guestIds.length) {
    return {
      success: false,
      message: 'One or more selected deliveries do not belong to this send',
      ...empty,
    };
  }

  // Re-render through the Dispatcher. Its own claim (`dispatched_at`) is
  // already set for a Schedule that has sent, so this queues nothing by itself
  // - the point is a freshly rendered payload for each chosen Delivery, built
  // by the one piece of code that knows how to build one.
  const dispatch = await dispatchScheduleById(supabase, scheduleId);
  if (dispatch.outcome === 'failed') {
    return {
      success: false,
      message: dispatch.reason ?? 'Could not prepare those messages',
      ...empty,
    };
  }

  // Queue only the chosen Deliveries, and only those the Dispatcher rendered.
  const { error: queueError } = await supabase
    .from('message_deliveries')
    .update({ next_attempt_at: new Date().toISOString() })
    .in('id', deliveryIds)
    .not('send_payload', 'is', null);
  if (queueError) {
    return { success: false, message: 'Could not queue those deliveries', ...empty };
  }

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  // Claim through the same function the Worker uses. A Delivery the Worker
  // took first simply is not returned here, and is counted as skipped.
  const { data: claimed, error: claimError } = await supabase.rpc('claim_delivery_batch', {
    p_limit: deliveryIds.length,
  });
  if (claimError) {
    return { success: false, message: 'Could not claim those deliveries', ...empty };
  }

  const rows = (claimed ?? []) as {
    delivery_id: string;
    attempt_id: string;
    send_payload: unknown;
  }[];

  // The claim is queue-wide, so it can return Deliveries this Operator did not
  // pick. Those are handed straight back rather than sent - they belong to the
  // Worker's drain, and sending them here would be exactly the uncoordinated
  // second sender this path exists to avoid.
  const wanted = new Set(deliveryIds);
  const mine = rows.filter((row) => wanted.has(row.delivery_id));
  const notMine = rows.filter((row) => !wanted.has(row.delivery_id));

  for (const row of notMine) {
    await supabase.from('message_delivery_attempts').delete().eq('id', row.attempt_id);
    await supabase
      .from('message_deliveries')
      .update({ next_attempt_at: new Date().toISOString() })
      .eq('id', row.delivery_id);
  }

  skippedCount += deliveryIds.length - mine.length;

  for (const row of mine) {
    const payload = parseSendPayload(row.send_payload);
    if (!payload) {
      await supabase
        .from('message_delivery_attempts')
        .update({ status: 'failed', error_message: 'Send payload could not be read' })
        .eq('id', row.attempt_id);
      failedCount += 1;
      continue;
    }

    const result = await postOne(payload);

    await supabase
      .from('message_delivery_attempts')
      .update(
        result.ok
          ? {
              status: 'sent',
              sent_at: new Date().toISOString(),
              external_message_id: result.messageId,
            }
          : { status: 'failed', error_message: result.error, error_code: result.code },
      )
      .eq('id', row.attempt_id);

    await supabase
      .from('message_deliveries')
      .update({ send_payload: null })
      .eq('id', row.delivery_id);

    if (result.ok) sentCount += 1;
    else failedCount += 1;
  }

  return {
    success: sentCount > 0,
    message:
      sentCount > 0
        ? `Sent to ${sentCount} ${sentCount === 1 ? 'guest record' : 'guest records'}${failedCount ? `, ${failedCount} failed` : ''}`
        : 'Nothing was sent',
    sentCount,
    failedCount,
    skippedCount,
  };
}
