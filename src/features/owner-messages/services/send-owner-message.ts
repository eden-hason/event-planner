import type { SupabaseClient } from '@supabase/supabase-js';
import { postWhatsAppTemplate } from '@/features/schedules/services/post-whatsapp';
import { ownerMessageTag } from '@/features/schedules/utils/whatsapp-callback-tag';
import { recordPackage } from '@/features/billing/utils/record-package';
import { buildOwnerMessagePayload } from '../utils/payload';
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
export async function loadOwnerMessageFacts(
  supabase: SupabaseClient,
  eventId: string,
): Promise<OwnerMessageFacts | null> {
  const [eventRes, paymentsRes] = await Promise.all([
    supabase
      .from('events')
      .select('id, user_id, event_date, bonus_records_override, event_types (key)')
      .eq('id', eventId)
      .maybeSingle(),
    supabase
      .from('event_billing_events')
      .select('record_count, channel')
      .eq('event_id', eventId)
      .not('record_count', 'is', null)
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  if (eventRes.error || paymentsRes.error || !eventRes.data) {
    console.error(`${TAG} Could not load event ${eventId}:`, eventRes.error ?? paymentsRes.error);
    return null;
  }
  const event = eventRes.data as {
    id: string;
    user_id: string;
    event_date: string | null;
    bonus_records_override: number | null;
    event_types: { key: string } | { key: string }[] | null;
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

  const payments = paymentsRes.data ?? [];
  const pkg = recordPackage({
    payments: payments.map((p) => p.record_count as number),
    bonusOverride: event.bonus_records_override,
  });
  const eventType = Array.isArray(event.event_types) ? event.event_types[0] : event.event_types;

  return {
    eventId: event.id,
    eventTypeKey: eventType?.key ?? null,
    eventDate: event.event_date,
    ownerUserId: event.user_id,
    ownerFullName: (profile?.full_name as string | null) ?? null,
    ownerPhone: (profile?.phone_number as string | null) ?? null,
    channel: (payments[0]?.channel as OwnerMessageFacts['channel'] | undefined) ?? null,
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
    return { success: true, status: 'accepted' };
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
