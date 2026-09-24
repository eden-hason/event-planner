import type { SupabaseClient } from '@supabase/supabase-js';
import {
  postWhatsAppSessionMessage,
  type WhatsAppSendResult,
} from '@/features/schedules/services/post-whatsapp';
import { conversationTag } from '@/features/schedules/utils/whatsapp-callback-tag';
import { buildOccasionPhrase, readEventTypeKey } from '@/features/events/utils/event-title';
import {
  conversationStep,
  typedCountStep,
  TYPED_TEXT_REPLY,
  type AwaitedAnswer,
  type ConversationEvent,
  type ConversationGuest,
  type ConversationStep,
  type OutgoingMessage,
} from '../utils/conversation';
import { parseConversationId, type ParsedConversationId } from '../utils/conversation-ids';
import { buildMealOptions } from '../utils/meal-options';
import { parseMealCounts } from '../utils/meal-counts';
import { isRsvpOpen } from '../utils/rsvp-cutoff';
import { recordGuestRsvp } from './record-rsvp';

/**
 * The Confirmation Conversation's I/O: one inbound WhatsApp message in, at most
 * one RSVP write and one reply out (CONTEXT.md, ADR 0017).
 *
 * Called by the WhatsApp webhook processor for every inbound message: a tap, or
 * text - which is read as a Guest count when the latest reply to that phone
 * asked for one (ADR 0023), and otherwise gets the fixed prompt. Replies
 * are posted inline, not queued - they answer something the Guest did seconds
 * ago - and are free, because the Guest's own message opened the 24-hour window.
 *
 * Idempotent by claim: the message id is inserted into whatsapp_inbound_messages
 * before anything else, and a message whose claim already exists is skipped. A
 * crash between claim and reply loses that one reply rather than risking two -
 * the same at-most-once stance as the send pipeline (ADR 0014). The Guest can
 * simply tap again.
 */

const TAG = '[confirmation-conversation]';

/** Only the fields read here. Meta's inbound message carries much more. */
export interface InboundWhatsAppMessage {
  id: string;
  /** The sender's WhatsApp id - their number in international form, no "+". */
  from: string;
  type: string;
  /** A tap on a template's quick-reply button. */
  button?: { payload?: string; text?: string };
  /** A tap on a session message's reply button or list row. */
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
  text?: { body?: string };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Typed text gets the fixed answer at most this often per Guest Record. */
const TYPED_TEXT_REPLY_INTERVAL_MS = 12 * 60 * 60 * 1000;

/**
 * How long a question waits for its typed answer - WhatsApp's own session
 * window. A number typed a day later is not read as an answer to it.
 */
const AWAITED_ANSWER_TTL_MS = 24 * 60 * 60 * 1000;

/** The action recorded for a typed answer to the count question. */
const TYPED_COUNT_ACTION = 'typedCount';

/** The count a Test Message's sample Guest starts from - nothing is stored to read. */
const SAMPLE_AMOUNT = 2;

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'http://localhost:3000'
  );
}

function rsvpUrl(token: string): string {
  return `${siteUrl()}/c/${token}`;
}

/** The hidden id and visible label of whatever was tapped, or null for anything else. */
function readTap(message: InboundWhatsAppMessage): { id: string; title: string } | null {
  if (message.type === 'button' && message.button?.payload) {
    return { id: message.button.payload, title: message.button.text ?? '' };
  }
  const reply = message.interactive?.button_reply ?? message.interactive?.list_reply;
  if (message.type === 'interactive' && reply?.id) {
    return { id: reply.id, title: reply.title ?? '' };
  }
  return null;
}

type ClaimRow = { id: string };

/**
 * The claim could not be written at all - nothing was acted on, so the payload
 * is worth retrying, unlike any failure after a successful claim.
 */
export class InboundClaimError extends Error {}

async function claim(
  supabase: SupabaseClient,
  message: InboundWhatsAppMessage,
  body: string | null,
): Promise<ClaimRow | null> {
  const { data, error } = await supabase
    .from('whatsapp_inbound_messages')
    .insert({
      wa_message_id: message.id,
      message_type: message.type,
      body,
      from_phone: message.from,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    // 23505: already claimed - a redelivery of a message we have handled.
    if (error.code === '23505') return null;
    throw new InboundClaimError(`Could not claim inbound message: ${error.message}`);
  }
  return data;
}

async function finish(
  supabase: SupabaseClient,
  claimId: string,
  fields: {
    deliveryId?: string | null;
    eventId?: string | null;
    action?: string | null;
    result?: WhatsAppSendResult | null;
    error?: string;
    /** What the reply asked the Guest to type - kept only if the reply went out. */
    awaits?: AwaitedAnswer | null;
  },
): Promise<void> {
  const { result } = fields;
  const awaits = result?.outcome === 'accepted' ? fields.awaits : null;
  const { error } = await supabase
    .from('whatsapp_inbound_messages')
    .update({
      delivery_id: fields.deliveryId ?? null,
      event_id: fields.eventId ?? null,
      action: fields.action ?? null,
      reply_message_id: result?.outcome === 'accepted' ? result.messageId : null,
      reply_error:
        fields.error ?? (result && result.outcome !== 'accepted' ? result.message : null),
      awaiting: awaits?.question ?? null,
      awaiting_attempt: awaits?.attempt ?? 0,
      processed_at: new Date().toISOString(),
    })
    .eq('id', claimId);
  if (error) console.error(`${TAG} Could not record the outcome:`, error);
}

/** `claimId` is the inbound row being answered, which tags the reply for its statuses. */
async function reply(
  to: string,
  message: OutgoingMessage,
  claimId: string,
): Promise<WhatsAppSendResult> {
  const result = await postWhatsAppSessionMessage(to, message, conversationTag(claimId));
  if (result.outcome !== 'accepted') {
    console.error(`${TAG} Reply not sent (${result.outcome}): ${result.message}`);
  }
  return result;
}

// --- Loading ---------------------------------------------------------------

type EventRow = {
  id: string;
  title: string;
  event_date: string | null;
  host_details: Record<string, unknown> | null;
  guests_experience: {
    dietary_options?: boolean;
    dietary_types?: string[];
    lock_guest_count?: boolean;
  } | null;
  event_types: unknown;
};

const EVENT_COLUMNS = 'id, title, event_date, host_details, guests_experience, event_types (key)';

function toConversationEvent(event: EventRow, token: string): ConversationEvent {
  return {
    occasionPhrase: buildOccasionPhrase({
      eventTypeKey: readEventTypeKey(event.event_types),
      hostDetails: event.host_details ?? undefined,
    }),
    lockGuestCount: event.guests_experience?.lock_guest_count ?? false,
    mealOptions: buildMealOptions(
      event.guests_experience
        ? {
            dietaryOptions: event.guests_experience.dietary_options,
            dietaryTypes: event.guests_experience.dietary_types,
          }
        : null,
    ),
    rsvpOpen: isRsvpOpen(event.event_date),
    rsvpUrl: rsvpUrl(token),
  };
}

// --- Steps -----------------------------------------------------------------

/** Rebuilds a Test Message's sample Guest: nothing is stored, so it comes from the step itself. */
function sampleGuest(confirmed: boolean, amount: number | null): ConversationGuest {
  return {
    rsvpStatus: confirmed ? 'confirmed' : 'pending',
    amount: amount ?? SAMPLE_AMOUNT,
    mealCounts: {},
  };
}

async function loadPreviewEvent(
  supabase: SupabaseClient,
  filter: { column: 'preview_token' | 'id'; value: string },
): Promise<(EventRow & { preview_token: string }) | null> {
  const { data } = await supabase
    .from('events')
    .select(`${EVENT_COLUMNS}, preview_token`)
    .eq(filter.column, filter.value)
    .maybeSingle();
  return data as unknown as (EventRow & { preview_token: string }) | null;
}

type DeliveryContext = {
  deliveryId: string;
  scheduleId: string;
  token: string;
  guestId: string;
  guest: ConversationGuest;
  event: ConversationEvent;
};

async function loadDelivery(
  supabase: SupabaseClient,
  filter: { column: 'confirmation_token' | 'id'; value: string },
): Promise<DeliveryContext | null> {
  const { data: delivery } = await supabase
    .from('message_deliveries')
    .select(
      `id, schedule_id, confirmation_token,
       guests!inner (id, rsvp_status, amount, meal_counts),
       schedules!inner (events!inner (${EVENT_COLUMNS}))`,
    )
    .eq(filter.column, filter.value)
    .maybeSingle();
  if (!delivery?.confirmation_token) return null;

  const guestRow = delivery.guests as unknown as {
    id: string;
    rsvp_status: 'pending' | 'confirmed' | 'declined';
    amount: number | null;
    meal_counts: unknown;
  };
  const eventRow = (delivery.schedules as unknown as { events: EventRow }).events;
  const token = delivery.confirmation_token as string;

  return {
    deliveryId: delivery.id as string,
    scheduleId: delivery.schedule_id as string,
    token,
    guestId: guestRow.id,
    guest: {
      rsvpStatus: guestRow.rsvp_status ?? 'pending',
      amount: guestRow.amount ?? 1,
      mealCounts: parseMealCounts(guestRow.meal_counts),
    },
    event: toConversationEvent(eventRow, token),
  };
}

/** Writes the step's update, if any, sends its reply and records the outcome. */
async function applyStep(
  supabase: SupabaseClient,
  message: InboundWhatsAppMessage,
  claimId: string,
  action: string,
  context: DeliveryContext,
  step: ConversationStep,
): Promise<void> {
  let outgoing = step.reply;
  let awaits = step.awaits;
  if (step.update) {
    const recorded = await recordGuestRsvp(supabase, {
      guestId: context.guestId,
      scheduleId: context.scheduleId,
      ...step.update,
      channel: 'whatsapp',
    });
    if (!recorded.ok) {
      // The answer did not land, so the next question would be a lie.
      outgoing = {
        kind: 'text',
        body: `משהו השתבש ולא הצלחנו לשמור את התשובה 😕\nאפשר לנסות שוב, או לעדכן באתר:\n${context.event.rsvpUrl}`,
      };
      awaits = null;
    }
  }

  const result = await reply(message.from, outgoing, claimId);
  await finish(supabase, claimId, { deliveryId: context.deliveryId, action, result, awaits });
}

// --- Taps ------------------------------------------------------------------

async function handleTap(
  supabase: SupabaseClient,
  message: InboundWhatsAppMessage,
  claimId: string,
  parsed: ParsedConversationId,
): Promise<void> {
  const action = parsed.action.type;

  // A Test Message carries the Event's preview token: the conversation plays out
  // in full on the Owner's phone and writes nothing (see Test Message).
  if (UUID_REGEX.test(parsed.token)) {
    const event = await loadPreviewEvent(supabase, { column: 'preview_token', value: parsed.token });
    if (!event) {
      await finish(supabase, claimId, { action, error: 'Unknown preview token' });
      return;
    }

    // Any answer past "Coming" implies Coming, and the count rides in the id.
    const step = conversationStep({
      token: parsed.token,
      action: parsed.action,
      guest: sampleGuest(!(action === 'yes' || action === 'no' || action === 'change'), parsed.amount),
      event: toConversationEvent(event, parsed.token),
    });
    const result = await reply(message.from, step.reply, claimId);
    await finish(supabase, claimId, { eventId: event.id, action, result, awaits: step.awaits });
    return;
  }

  const context = await loadDelivery(supabase, { column: 'confirmation_token', value: parsed.token });
  if (!context) {
    // A token from another environment sharing the number, or a deleted guest.
    console.warn(`${TAG} No delivery for a tapped token`);
    await finish(supabase, claimId, { action, error: 'Unknown confirmation token' });
    return;
  }

  const step = conversationStep({
    token: parsed.token,
    action: parsed.action,
    guest: context.guest,
    event: context.event,
  });
  await applyStep(supabase, message, claimId, action, context, step);
}

// --- Typed count -------------------------------------------------------------

type AwaitingRow = {
  id: string;
  delivery_id: string | null;
  event_id: string | null;
  awaiting: 'count' | null;
  awaiting_attempt: number;
  received_at: string;
};

/**
 * The question this phone's text answers, if any: the latest reply Kululu sent
 * it, when that reply asked for a count, is recent, and no Delivery has reached
 * the phone since. "Latest question wins" is what settles two Events on one
 * phone - the Guest is answering the last thing they were asked.
 */
async function findAwaitedAnswer(
  supabase: SupabaseClient,
  message: InboundWhatsAppMessage,
  claimId: string,
): Promise<AwaitingRow | null> {
  const { data: latest } = await supabase
    .from('whatsapp_inbound_messages')
    .select('id, delivery_id, event_id, awaiting, awaiting_attempt, received_at')
    .eq('from_phone', message.from)
    .neq('id', claimId)
    .not('reply_message_id', 'is', null)
    .order('received_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = latest as AwaitingRow | null;
  if (!row?.awaiting) return null;
  if (Date.now() - new Date(row.received_at).getTime() > AWAITED_ANSWER_TTL_MS) return null;

  // A newer message from Kululu - another Event's invitation, a reminder - is
  // now the thing the Guest is replying to, not the count question.
  const { count } = await supabase
    .from('message_deliveries')
    .select('id, guests!inner (phone_number)', { count: 'exact', head: true })
    .eq('guests.phone_number', `+${message.from}`)
    .gt('sent_at', row.received_at);
  if (count) return null;

  return row;
}

async function handleTypedCount(
  supabase: SupabaseClient,
  message: InboundWhatsAppMessage,
  claimId: string,
  text: string,
  awaited: AwaitingRow,
): Promise<void> {
  const action = TYPED_COUNT_ACTION;
  const attempt = awaited.awaiting_attempt;

  if (awaited.event_id && !awaited.delivery_id) {
    const event = await loadPreviewEvent(supabase, { column: 'id', value: awaited.event_id });
    if (!event) {
      await finish(supabase, claimId, { action, error: 'Unknown Test Message event' });
      return;
    }
    const step = typedCountStep({
      token: event.preview_token,
      text,
      attempt,
      guest: sampleGuest(true, null),
      event: toConversationEvent(event, event.preview_token),
    });
    const result = await reply(message.from, step.reply, claimId);
    await finish(supabase, claimId, { eventId: event.id, action, result, awaits: step.awaits });
    return;
  }

  const context = awaited.delivery_id
    ? await loadDelivery(supabase, { column: 'id', value: awaited.delivery_id })
    : null;
  if (!context) {
    await finish(supabase, claimId, { action, error: 'Awaited answer lost its delivery' });
    return;
  }

  const step = typedCountStep({
    token: context.token,
    text,
    attempt,
    guest: context.guest,
    event: context.event,
  });
  await applyStep(supabase, message, claimId, action, context, step);
}

// --- Typed text --------------------------------------------------------------

/**
 * Typed text that answers no question is not interpreted or passed to the hosts
 * (ADR 0017). It is answered with a fixed prompt pointing back to the buttons - at most once every 12 hours, so a
 * chatty Guest is not answered by a bot after every line.
 */
async function handleTypedText(
  supabase: SupabaseClient,
  message: InboundWhatsAppMessage,
  claimId: string,
): Promise<void> {
  const { data: latest } = await supabase
    .from('message_deliveries')
    .select(
      `id, guest_id, created_at,
       guests!inner (id, phone_number, events!inner (event_date))`,
    )
    .eq('guests.phone_number', `+${message.from}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const guest = latest?.guests as unknown as {
    id: string;
    events: { event_date: string | null };
  } | undefined;

  // Nothing Kululu sent this phone, or only for an Event already over: not a
  // conversation we are part of, so no answer.
  if (!latest || !guest || !isRsvpOpen(guest.events.event_date)) {
    await finish(supabase, claimId, { error: 'Typed text with no open conversation' });
    return;
  }

  const since = new Date(Date.now() - TYPED_TEXT_REPLY_INTERVAL_MS).toISOString();
  const { count } = await supabase
    .from('whatsapp_inbound_messages')
    .select('id', { count: 'exact', head: true })
    .eq('delivery_id', latest.id)
    .eq('message_type', 'text')
    .is('action', null)
    .not('reply_message_id', 'is', null)
    .gte('received_at', since);

  const result = count ? null : await reply(message.from, { kind: 'text', body: TYPED_TEXT_REPLY }, claimId);
  await finish(supabase, claimId, { deliveryId: latest.id as string, result });
}

// --- Entry point -------------------------------------------------------------

export async function handleInboundWhatsAppMessage(
  supabase: SupabaseClient,
  message: InboundWhatsAppMessage,
): Promise<void> {
  if (!message.id || !message.from) return;

  const tap = readTap(message);
  const text = message.type === 'text' ? (message.text?.body ?? '').trim() : '';

  // Reactions, stickers, media and the like are not part of the conversation.
  if (!tap && !text) return;

  const claimed = await claim(supabase, message, tap?.title ?? text);
  if (!claimed) return;

  if (tap) {
    const parsed = parseConversationId(tap.id);
    if (!parsed) {
      // Someone else's button, or an older template's. Not ours to answer.
      await finish(supabase, claimed.id, { error: 'Unrecognised reply id' });
      return;
    }
    await handleTap(supabase, message, claimed.id, parsed);
    return;
  }

  const awaited = await findAwaitedAnswer(supabase, message, claimed.id);
  if (awaited) {
    await handleTypedCount(supabase, message, claimed.id, text, awaited);
    return;
  }

  await handleTypedText(supabase, message, claimed.id);
}
