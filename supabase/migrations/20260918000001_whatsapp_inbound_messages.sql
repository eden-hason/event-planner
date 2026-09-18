-- One row per inbound WhatsApp message a Guest sends Kululu.
--
-- Until now inbound messages were stored in webhook_events and logged, nothing
-- more. The Confirmation Conversation acts on them - a tap on "Coming" confirms
-- the Guest and sends the next question - so each one has to be acted on
-- exactly once. Meta redelivers webhooks at least once, and the inbox retries a
-- payload whose processing threw, so the same tap can arrive several times.
--
-- This table is the claim: the processor inserts the message id first and only
-- acts if the insert was new (ADR 0017). It doubles as the record of what the
-- Guest said and what Kululu answered, against the Delivery it belongs to, for
-- an Operator debugging a conversation.
--
-- Service-role only: RLS on, no policies.

create table public.whatsapp_inbound_messages (
  id uuid primary key default gen_random_uuid(),
  -- Meta's wamid for the inbound message. The idempotency key.
  wa_message_id text not null unique,
  -- The Delivery the reply was routed to. Null for a Test Message (routed by
  -- the Event's preview token) and for anything that could not be routed.
  delivery_id uuid references public.message_deliveries(id) on delete cascade,
  -- The Event of a Test Message conversation, which has no Delivery.
  event_id uuid references public.events(id) on delete cascade,
  -- Meta's message type: button, interactive, text, ...
  message_type text not null,
  -- The parsed action ("yes", "count", ...), or null for typed text.
  action text,
  -- What the Guest tapped (the option's title) or typed.
  body text,
  -- The wamid of Kululu's answer, or why none was sent.
  reply_message_id text,
  reply_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index whatsapp_inbound_messages_delivery_id_idx
  on public.whatsapp_inbound_messages (delivery_id);

alter table public.whatsapp_inbound_messages enable row level security;

comment on table public.whatsapp_inbound_messages is
  'Inbound WhatsApp messages acted on by the Confirmation Conversation. Insert-first claim on wa_message_id makes processing idempotent (ADR 0017).';
