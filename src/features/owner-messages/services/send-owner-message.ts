import type { SupabaseClient } from '@supabase/supabase-js';
import { postWhatsAppTemplate } from '@/features/schedules/services/post-whatsapp';
import { ownerMessageTag } from '@/features/schedules/utils/whatsapp-callback-tag';
import { recordPackage } from '@/features/billing/utils/record-package';
import { listEventPayments } from '@/features/billing/services/list-event-payments';
import { isRecordsPayment } from '@/features/billing/utils/payment-kinds';
import { buildOwnerMessagePayload } from '../utils/payload';
import { ownerMessageStatusUpdate } from '../utils/status';
import type {
  OwnerMessageFacts,
  OwnerMessageKind,
  OwnerMessageStatus,
  SendOwnerMessageResult,
} from '../types';

const TAG = '[owner-messages]';

/**
 * Everything a send needs about the Event and the Owner who created it. Read
 * at send time, never stored ahead, so a name or phone fixed after the payment
 * is the one that is used.
 */
async function loadOwnerMessageFacts(
  supabase: SupabaseClient,
  eventId: string,
): Promise<OwnerMessageFacts | null> {
  const [eventRes, payments] = await Promise.all([
    supabase
      .from('events')
      .select('user_id, bonus_records_override')
      .eq('id', eventId)
      .maybeSingle(),
    listEventPayments(supabase, eventId),
  ]);

  if (eventRes.error || !eventRes.data || !payments) {
    console.error(`${TAG} Could not load event ${eventId}:`, eventRes.error);
    return null;
  }
  const event = eventRes.data as {
    user_id: string;
    bonus_records_override: number | null;
  };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, phone_number')
    .eq('id', event.user_id)
    .maybeSingle();
  if (profileError) {
    console.error(`${TAG} Could not load the owner of ${eventId}:`, profileError);
    return null;
  }

  const recordsPayments = payments.filter(isRecordsPayment);
  const pkg = recordPackage({
    payments: recordsPayments.map((p) => p.records),
    bonusOverride: event.bonus_records_override,
  });

  return {
    ownerUserId: event.user_id,
    ownerFullName: (profile?.full_name as string | null) ?? null,
    ownerPhone: (profile?.phone_number as string | null) ?? null,
    channel: recordsPayments[0]?.channel ?? null,
    packageSize: pkg?.size ?? null,
  };
}

/**
 * Makes one claimed send: renders it, posts it, and records what happened on
 * its row. The row must already be `sending` - claimed by the Sweeper or
 * inserted by an Operator's "send now" - so this never decides whether to send.
 *
 * Never retried. A refusal is final (a missing phone stays missing), and a send
 * with no answer from Meta may have gone out (ADR 0014).
 */
export async function deliverOwnerMessage(
  supabase: SupabaseClient,
  row: { id: string; eventId: string; kind: OwnerMessageKind },
): Promise<SendOwnerMessageResult> {
  const facts = await loadOwnerMessageFacts(supabase, row.eventId);
  if (!facts) {
    await recordOutcome(supabase, row.id, { status: 'failed', error_message: 'לא הצלחנו לטעון את האירוע' });
    return { success: false, message: 'לא הצלחנו לטעון את האירוע' };
  }

  const built = buildOwnerMessagePayload(row.kind, facts);
  if (!built.ok) {
    await recordOutcome(supabase, row.id, {
      status: 'failed',
      error_message: built.message,
      recipient_user_id: facts.ownerUserId,
      phone_number: facts.ownerPhone,
    });
    return { success: false, message: built.message };
  }

  const result = await postWhatsAppTemplate(built.payload, ownerMessageTag(row.id));
  const recipient = { recipient_user_id: facts.ownerUserId, phone_number: built.payload.to };

  if (result.outcome === 'accepted') {
    await recordOutcome(supabase, row.id, {
      ...recipient,
      status: 'accepted',
      external_message_id: result.messageId,
      error_message: null,
    });
    return { success: true };
  }

  const status: OwnerMessageStatus = result.outcome === 'rejected' ? 'failed' : 'unknown';
  console.error(`${TAG} ${row.kind} for ${row.eventId} ${result.outcome}: ${result.message}`);
  await recordOutcome(supabase, row.id, { ...recipient, status, error_message: result.message });
  return {
    success: false,
    message: status === 'failed' ? 'WhatsApp דחה את ההודעה' : 'לא התקבלה תשובה מ-WhatsApp',
  };
}

/**
 * An Operator's "send now" (ADR 0039). Outside the once-only rule and the
 * 48-hour one: it is a new row with `sent_by` set, so it never collides with
 * the automatic send and is logged next to it.
 */
export async function sendOwnerMessageNow(
  supabase: SupabaseClient,
  params: { eventId: string; kind: OwnerMessageKind; operatorId: string },
): Promise<SendOwnerMessageResult> {
  const { data, error } = await supabase
    .from('owner_messages')
    .insert({
      event_id: params.eventId,
      kind: params.kind,
      sent_by: params.operatorId,
      status: 'sending',
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error(`${TAG} Could not record a manual send:`, error);
    return { success: false, message: 'לא הצלחנו לרשום את השליחה' };
  }

  return deliverOwnerMessage(supabase, { id: data.id, eventId: params.eventId, kind: params.kind });
}

async function recordOutcome(
  supabase: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('owner_messages').update(patch).eq('id', id);
  if (error) console.error(`${TAG} Could not record the outcome of ${id}:`, error);
}

/**
 * Lands one of Meta's statuses on an Owner Message row, for the webhook
 * processor. Guarded on the statuses it outranks, like a Delivery Attempt, so
 * redeliveries and out-of-order statuses change nothing. Throws on a failed
 * write, so the webhook row is kept and tried again.
 */
export async function applyOwnerMessageStatus(
  supabase: SupabaseClient,
  ownerMessageId: string,
  metaStatus: string,
  errorMessage: string,
): Promise<void> {
  const update = ownerMessageStatusUpdate(metaStatus);
  if (!update) return;

  const { error } = await supabase
    .from('owner_messages')
    .update({
      status: update.status,
      ...(update.status === 'failed' && { error_message: errorMessage }),
    })
    .eq('id', ownerMessageId)
    .in('status', update.from);
  if (error) throw new Error(`Owner message ${ownerMessageId} update failed: ${error.message}`);
}
