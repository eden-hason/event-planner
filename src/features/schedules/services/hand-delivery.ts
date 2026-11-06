import type { SupabaseClient } from '@supabase/supabase-js';
import { toE164 } from '@/lib/phone';
import { buildSmsBody, type ParameterResolutionContext } from '../utils';
import {
  HAND_TRIGGER,
  handDeliveryRefusal,
  whatsappChatUrl,
  type HandDeliveryRefusal,
} from '../utils/hand-delivery';
import {
  loadFallbackSchedule,
  loadGuestsAndTables,
  resolveSmsRendition,
  smsTemplateFor,
} from './send-sms-fallback';

/**
 * The Hand Delivery engine (CONTEXT.md, ADR 0052). An Operator sends a
 * Schedule's message to a Guest on WhatsApp from a Kululu team phone, then
 * records that it reached them. Kululu sends nothing itself: it renders the
 * text, and later takes the Operator's word for it.
 *
 * Server-only, and the Back Office's alone - it runs with the service role
 * (an Owner's session cannot write a Hand Delivery, see the migration).
 */

export type HandDeliveryMessage = {
  deliveryId: string;
  guestName: string;
  phone: string;
  /** The Schedule's SMS Rendition for this Guest, their RSVP link included */
  text: string;
  /** Opens WhatsApp on the Operator's device with `text` typed in */
  chatUrl: string;
};

type Result<T> = ({ ok: true } & T) | { ok: false; message: string };

type DeliveryRow = {
  id: string;
  status: string;
  schedule_id: string;
  guest_id: string;
  confirmation_token: string | null;
  schedules: { event_id: string } | null;
  message_delivery_attempts: { triggered_by: string | null }[];
};

const REFUSAL_MESSAGES: Record<HandDeliveryRefusal, string> = {
  not_failed: 'השליחה הזו כבר לא במצב נכשל',
  already_by_hand: 'השליחה הזו כבר סומנה כנמסרה ידנית',
};

async function loadDelivery(
  supabase: SupabaseClient,
  deliveryId: string,
): Promise<DeliveryRow | null> {
  const { data, error } = await supabase
    .from('message_deliveries')
    .select(
      'id, status, schedule_id, guest_id, confirmation_token, schedules(event_id), message_delivery_attempts(triggered_by)',
    )
    .eq('id', deliveryId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as DeliveryRow | null) ?? null;
}

/**
 * The message to type into WhatsApp for one Failed Delivery: the Schedule's
 * SMS Rendition rendered for this Guest with the Delivery's own RSVP token, so
 * an answer through it lands on this Delivery like any other.
 */
export async function buildHandDeliveryMessage(
  supabase: SupabaseClient,
  deliveryId: string,
): Promise<Result<{ message: HandDeliveryMessage }>> {
  const delivery = await loadDelivery(supabase, deliveryId);
  if (!delivery) return { ok: false, message: 'השליחה הזו כבר לא קיימת' };

  const refusal = handDeliveryRefusal({
    status: delivery.status,
    attempts: delivery.message_delivery_attempts,
  });
  if (refusal) return { ok: false, message: REFUSAL_MESSAGES[refusal] };
  if (!delivery.confirmation_token) {
    return { ok: false, message: 'לשליחה הזו אין קישור אישור הגעה' };
  }

  const loaded = await loadFallbackSchedule(supabase, delivery.schedule_id);
  if (!loaded) return { ok: false, message: 'התזמון הזה כבר לא קיים' };

  const resolution = await resolveSmsRendition(supabase, loaded);
  if (!resolution.ok) return { ok: false, message: resolution.reason };

  const { guests, tables } = await loadGuestsAndTables(
    supabase,
    [delivery.guest_id],
    Boolean(resolution.withTable),
  );
  const guest = guests.get(delivery.guest_id);
  if (!guest) return { ok: false, message: 'רשומת האורח כבר לא קיימת' };

  const phone = toE164(guest.phone);
  if (!phone) return { ok: false, message: 'אין לאורח מספר טלפון תקין' };

  const context: ParameterResolutionContext = {
    guest,
    event: loaded.event,
    group: null,
    table: (guest.tableId ? tables.get(guest.tableId) : null) ?? null,
    schedule: loaded.schedule,
    confirmationToken: delivery.confirmation_token,
  };
  const text = buildSmsBody(smsTemplateFor(resolution, guest).payload, context);

  return {
    ok: true,
    message: {
      deliveryId,
      guestName: guest.name,
      phone,
      text,
      chatUrl: whatsappChatUrl(phone, text),
    },
  };
}

/**
 * Records the Operator's word that the message reached the Guest: one attempt,
 * already Delivered, and the roll-up makes the Delivery Delivered. Nothing is
 * recorded for opening WhatsApp - Kululu cannot see whether it went.
 *
 * The database allows one Hand Delivery per Delivery, so two Operators pressing
 * together record it once.
 */
export async function recordHandDelivery(
  supabase: SupabaseClient,
  deliveryId: string,
  operatorId: string,
): Promise<Result<{ eventId: string }>> {
  const delivery = await loadDelivery(supabase, deliveryId);
  if (!delivery?.schedules) return { ok: false, message: 'השליחה הזו כבר לא קיימת' };

  const refusal = handDeliveryRefusal({
    status: delivery.status,
    attempts: delivery.message_delivery_attempts,
  });
  if (refusal) return { ok: false, message: REFUSAL_MESSAGES[refusal] };

  const now = new Date().toISOString();
  const { error } = await supabase.from('message_delivery_attempts').insert({
    delivery_id: deliveryId,
    channel: 'whatsapp',
    status: 'delivered',
    triggered_by: HAND_TRIGGER,
    recorded_by: operatorId,
    sent_at: now,
    delivered_at: now,
  });
  if (error) {
    if (error.code === '23505') {
      return { ok: false, message: REFUSAL_MESSAGES.already_by_hand };
    }
    throw error;
  }
  return { ok: true, eventId: delivery.schedules.event_id };
}

/**
 * Withdraws a Hand Delivery recorded by mistake by erasing it - the one
 * Delivery Attempt that may be erased (ADR 0052). The roll-up runs on delete,
 * so the Delivery falls back to Failed. An answer the Guest gave meanwhile is
 * theirs and stays.
 */
export async function withdrawHandDelivery(
  supabase: SupabaseClient,
  deliveryId: string,
): Promise<Result<{ eventId: string }>> {
  const delivery = await loadDelivery(supabase, deliveryId);
  if (!delivery?.schedules) return { ok: false, message: 'השליחה הזו כבר לא קיימת' };

  const { data, error } = await supabase
    .from('message_delivery_attempts')
    .delete()
    .eq('delivery_id', deliveryId)
    .eq('triggered_by', HAND_TRIGGER)
    .select('id');
  if (error) throw error;
  if (!data?.length) return { ok: false, message: 'לשליחה הזו אין מסירה ידנית לבטל' };
  return { ok: true, eventId: delivery.schedules.event_id };
}
