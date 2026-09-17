import type { SupabaseClient } from '@supabase/supabase-js';
import { renderScheduleDeliveries } from './render-deliveries';
import { postWhatsAppTemplate } from './post-whatsapp';
import { sendSmsMessage } from '../actions/sms';
import { parseSendPayload, type SendPayload } from '../utils/send-payload';

/**
 * An Operator's send to a handful of named Guests.
 *
 * The important part is what it does *not* do: it does not build its own
 * messages and it does not send outside the claim protocol. It re-renders the
 * chosen Deliveries through the same renderer the Dispatcher uses, queues only
 * those, and claims them through `claim_delivery_batch` exactly as the Worker
 * would - scoped to the Deliveries the Operator picked, so it can never take
 * another Event's work out of the queue.
 *
 * That claim is the only thing stopping an Operator and the Worker sending to
 * the same Guest at once (ADR 0014). An Operator pressing this while a drain is
 * running is not hypothetical - it is what an Operator does when a send looks
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

type PostResult = {
  ok: boolean;
  messageId: string | null;
  error: string | null;
  code: number | null;
};

async function postOne(payload: SendPayload): Promise<PostResult> {
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
    // An unknown outcome carries no code on purpose: that keeps it System-level
    // and out of any automatic SMS to a guest who may already have the message.
    code: result.outcome === 'rejected' ? result.errorCode : null,
  };
}

export async function sendSelectedDeliveries(
  supabase: SupabaseClient,
  scheduleId: string,
  guestIds: string[],
): Promise<ManualSendOutcome> {
  const empty = { sentCount: 0, failedCount: 0, skippedCount: 0 };

  // Render fresh payloads for exactly these Guests. Deliberately not through
  // the Dispatcher: a Schedule that has already been dispatched would lose the
  // claim race and render nothing, and the Dispatcher would also apply the
  // expiry rule - so resending after the Event would mark the Schedule expired
  // instead of sending it. Rendering is not dispatching.
  const render = await renderScheduleDeliveries(supabase, scheduleId, { guestIds });
  if (!render.ok) {
    return { success: false, message: render.reason, ...empty };
  }

  const byDeliveryId = new Map(render.rendered.map((item) => [item.deliveryId, item]));
  const deliveryIds = [...byDeliveryId.keys()];

  // Queue only what was rendered for these Guests.
  for (const item of render.rendered) {
    const { error } = await supabase
      .from('message_deliveries')
      .update({
        template_id: item.templateId,
        send_payload: item.payload,
        next_attempt_at: new Date().toISOString(),
      })
      .eq('id', item.deliveryId);
    if (error) {
      console.error('[manual-send] Could not queue delivery', item.deliveryId, error);
    }
  }

  // Scoped claim: only these Deliveries, and only if the Worker has not taken
  // one first. Anything it took is simply not returned, and is counted skipped
  // rather than clawed back - un-claiming is what ADR 0014 forbids.
  const { data: claimed, error: claimError } = await supabase.rpc('claim_delivery_batch', {
    p_limit: deliveryIds.length,
    p_delivery_ids: deliveryIds,
  });
  if (claimError) {
    console.error('[manual-send] Claim failed:', claimError);
    return { success: false, message: 'Could not claim those deliveries', ...empty };
  }

  const rows = (claimed ?? []) as {
    delivery_id: string;
    attempt_id: string;
    send_payload: unknown;
  }[];

  let sentCount = 0;
  let failedCount = 0;
  const skippedCount = deliveryIds.length - rows.length;

  for (const row of rows) {
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

    // The payload carries the guest's phone number and name, and exists only
    // while a Delivery is in flight.
    await supabase
      .from('message_deliveries')
      .update({ send_payload: null })
      .eq('id', row.delivery_id);

    if (result.ok) sentCount += 1;
    else failedCount += 1;
  }

  console.log(
    `[manual-send] ${scheduleId}: sent ${sentCount}, failed ${failedCount}, skipped ${skippedCount}`,
  );

  return {
    success: sentCount > 0,
    message:
      sentCount > 0
        ? `Sent to ${sentCount} ${sentCount === 1 ? 'guest record' : 'guest records'}` +
          (failedCount ? `, ${failedCount} failed` : '') +
          (skippedCount ? `, ${skippedCount} already in flight` : '')
        : 'Nothing was sent',
    sentCount,
    failedCount,
    skippedCount,
  };
}
