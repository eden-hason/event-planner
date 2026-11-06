import type { SupabaseClient } from '@supabase/supabase-js';
import { toE164 } from '@/lib/phone';
import {
  HAND_TRIGGER,
  handDeliveryRefusal,
  whatsappChatUrl,
  type HandDeliveryRefusal,
} from '../utils/hand-delivery';
import {
  loadFallbackSchedule,
  renderSmsRenditionFor,
  resolveSmsRendition,
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
  phone: string;
  /** The Schedule's SMS Rendition for this Guest, their RSVP link included */
  text: string;
  /** Opens WhatsApp on the Operator's device with `text` typed in */
  chatUrl: string;
};

export type HandDeliveryResult<T = object> = ({ ok: true } & T) | { ok: false; message: string };

type DeliveryRow = {
  id: string;
  status: string;
  schedule_id: string;
  guest_id: string;
  confirmation_token: string | null;
  schedules: { event_id: string };
  message_delivery_attempts: { triggered_by: string | null }[];
};

const REFUSAL_MESSAGES: Record<HandDeliveryRefusal, string> = {
  not_failed: 'השליחה הזו כבר לא במצב נכשל',
  already_by_hand: 'השליחה הזו כבר סומנה כנמסרה ידנית',
};

/**
 * The Delivery, or why there is nothing to act on. With `eligible`, also
 * refuses one that offers no Hand Delivery - the same rule for showing the
 * message and for recording it.
 */
async function loadDelivery(
  supabase: SupabaseClient,
  deliveryId: string,
  { eligible = false } = {},
): Promise<HandDeliveryResult<{ delivery: DeliveryRow }>> {
  const { data, error } = await supabase
    .from('message_deliveries')
    .select(
      'id, status, schedule_id, guest_id, confirmation_token, schedules(event_id), message_delivery_attempts(triggered_by)',
    )
    .eq('id', deliveryId)
    .maybeSingle();
  if (error) throw error;
  const delivery = data as unknown as DeliveryRow | null;
  if (!delivery?.schedules) return { ok: false, message: 'השליחה הזו כבר לא קיימת' };

  if (eligible) {
    const refusal = handDeliveryRefusal({
      status: delivery.status,
      attempts: delivery.message_delivery_attempts,
    });
    if (refusal) return { ok: false, message: REFUSAL_MESSAGES[refusal] };
  }
  return { ok: true, delivery };
}

/**
 * The message to type into WhatsApp for one Failed Delivery: the Schedule's
 * SMS Rendition rendered for this Guest with the Delivery's own RSVP token, so
 * an answer through it lands on this Delivery like any other.
 */
export async function buildHandDeliveryMessage(
  supabase: SupabaseClient,
  deliveryId: string,
): Promise<HandDeliveryResult<{ message: HandDeliveryMessage }>> {
  const loadedDelivery = await loadDelivery(supabase, deliveryId, { eligible: true });
  if (!loadedDelivery.ok) return loadedDelivery;
  const { delivery } = loadedDelivery;
  if (!delivery.confirmation_token) {
    return { ok: false, message: 'לשליחה הזו אין קישור אישור הגעה' };
  }

  const loaded = await loadFallbackSchedule(supabase, delivery.schedule_id);
  if (!loaded) return { ok: false, message: 'התזמון הזה כבר לא קיים' };

  const resolution = await resolveSmsRendition(supabase, loaded);
  if (!resolution.ok) return { ok: false, message: resolution.reason };

  const rendered = await renderSmsRenditionFor(
    supabase,
    loaded,
    resolution,
    delivery.guest_id,
    delivery.confirmation_token,
  );
  if (!rendered) return { ok: false, message: 'רשומת האורח כבר לא קיימת' };

  const phone = toE164(rendered.guest.phone);
  if (!phone) return { ok: false, message: 'אין לאורח מספר טלפון תקין' };

  return {
    ok: true,
    message: { phone, text: rendered.text, chatUrl: whatsappChatUrl(phone, rendered.text) },
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
): Promise<HandDeliveryResult<{ eventId: string }>> {
  const loaded = await loadDelivery(supabase, deliveryId, { eligible: true });
  if (!loaded.ok) return loaded;

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
  return { ok: true, eventId: loaded.delivery.schedules.event_id };
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
): Promise<HandDeliveryResult<{ eventId: string }>> {
  const loaded = await loadDelivery(supabase, deliveryId);
  if (!loaded.ok) return loaded;

  const { data, error } = await supabase
    .from('message_delivery_attempts')
    .delete()
    .eq('delivery_id', deliveryId)
    .eq('triggered_by', HAND_TRIGGER)
    .select('id');
  if (error) throw error;
  if (!data?.length) return { ok: false, message: 'לשליחה הזו אין מסירה ידנית לבטל' };
  return { ok: true, eventId: loaded.delivery.schedules.event_id };
}
