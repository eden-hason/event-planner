import type { SupabaseClient } from '@supabase/supabase-js';
import { toE164 } from '@/lib/phone';
import { rsvpPageUrl } from '../utils';
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
  /**
   * The Schedule's SMS Rendition for this Guest, their RSVP link included.
   * Null when there is none to render - a Bespoke Template written for
   * WhatsApp alone - and the Operator writes the message themselves.
   */
  text: string | null;
  /** Why there is no text, for the Operator; null when there is */
  noTextReason: string | null;
  /** The Guest's own RSVP page, to paste into a message written by hand */
  rsvpUrl: string | null;
  /** Opens WhatsApp on the Operator's device with `text` typed in, or empty */
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
  guests: { phone_number: string | null } | null;
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
      'id, status, schedule_id, guest_id, confirmation_token, schedules(event_id), guests(phone_number), message_delivery_attempts(triggered_by)',
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
 *
 * A message Kululu cannot render still opens the chat, empty, for the Operator
 * to write in: the Hand Delivery is the Operator's word either way.
 */
export async function buildHandDeliveryMessage(
  supabase: SupabaseClient,
  deliveryId: string,
): Promise<HandDeliveryResult<{ message: HandDeliveryMessage }>> {
  const loadedDelivery = await loadDelivery(supabase, deliveryId, { eligible: true });
  if (!loadedDelivery.ok) return loadedDelivery;
  const { delivery } = loadedDelivery;

  const phone = toE164(delivery.guests?.phone_number);
  if (!phone) return { ok: false, message: 'אין לאורח מספר טלפון תקין' };

  const token = delivery.confirmation_token;
  const rendered = token
    ? await renderHandText(supabase, delivery.schedule_id, delivery.guest_id, token)
    : { text: null, reason: 'לשליחה הזו אין קישור אישור הגעה' };

  return {
    ok: true,
    message: {
      phone,
      text: rendered.text,
      noTextReason: rendered.reason,
      rsvpUrl: token ? rsvpPageUrl(token) : null,
      chatUrl: whatsappChatUrl(phone, rendered.text),
    },
  };
}

/** The SMS Rendition's text, or why there is none */
async function renderHandText(
  supabase: SupabaseClient,
  scheduleId: string,
  guestId: string,
  token: string,
): Promise<{ text: string; reason: null } | { text: null; reason: string }> {
  const loaded = await loadFallbackSchedule(supabase, scheduleId);
  if (!loaded) return { text: null, reason: 'התזמון הזה כבר לא קיים' };

  const resolution = await resolveSmsRendition(supabase, loaded);
  if (!resolution.ok) {
    // Typically a Bespoke Template written for WhatsApp alone, with no SMS
    // Rendition to type in. The cause is kept for whoever debugs it.
    console.warn('[hand-delivery] No SMS Rendition for schedule', scheduleId, resolution.reason);
    return { text: null, reason: 'לתזמון הזה אין נוסח טקסט שאפשר להכין מראש' };
  }

  // On the current Message Plan this is the message's SMS body (ADR 0055):
  // the WhatsApp words with one real link line per button, never the
  // preview's bracketed button labels.
  const rendered = await renderSmsRenditionFor(supabase, loaded, resolution, guestId, token);
  if (!rendered) return { text: null, reason: 'רשומת האורח כבר לא קיימת' };
  if (rendered.text === null) {
    console.warn('[hand-delivery] Could not render the message for schedule', scheduleId, rendered.reason);
    return { text: null, reason: 'לתזמון הזה אין נוסח טקסט שאפשר להכין מראש' };
  }
  return { text: rendered.text, reason: null };
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
