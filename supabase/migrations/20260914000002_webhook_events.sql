-- An inbox for provider webhooks: store the raw notification first, process it
-- second.
--
-- The WhatsApp webhook processed each notification inside the request and kept
-- only the outcome. Because it answers 200 even when processing fails (Meta
-- disables a webhook that keeps erroring), a failed write was simply lost: Meta
-- would not retry, and the payload survived only in expiring, masked logs.
-- Template status changes, quality ratings, opt-outs and inbound replies were
-- logged and never stored at all.
--
-- Now the handler verifies the signature, inserts the body here, answers 200,
-- and processes the stored row afterwards. A row left unprocessed is picked up
-- again later. Provider-agnostic so the next webhook (ActiveTrail, payments)
-- lands in the same place.
--
-- Payloads carry guest phone numbers. They are working data, not an archive:
-- rows older than 90 days are purged, and what matters long-term already lives
-- on message_delivery_attempts.

create table public.webhook_events (
  id            uuid        primary key default gen_random_uuid(),
  provider      text        not null,
  -- sha256 of the raw body. Meta redelivers byte-identical bodies; the same
  -- notification is stored once.
  payload_hash  text        not null,
  payload       jsonb       not null,
  -- The change fields the payload carried (statuses live under 'messages'),
  -- so an Operator can find template or quality notifications without
  -- unpacking every body.
  fields        text[]      not null default '{}',
  received_at   timestamptz not null default now(),
  processed_at  timestamptz null,
  process_attempts integer  not null default 0,
  last_error    text        null,
  constraint webhook_events_provider_check check (provider in ('whatsapp'))
);

comment on table public.webhook_events is
  'Raw provider webhook notifications, stored before processing. Unprocessed rows are retried; rows are purged after 90 days (they contain guest phone numbers).';

create unique index webhook_events_provider_payload_hash_key
  on public.webhook_events (provider, payload_hash);

-- The retry sweep reads only what is still waiting.
create index webhook_events_unprocessed_idx
  on public.webhook_events (received_at)
  where processed_at is null;

-- The purge and any "what did Meta send around 20:00" lookup.
create index webhook_events_received_at_idx
  on public.webhook_events (received_at);

create index webhook_events_fields_idx
  on public.webhook_events using gin (fields);

-- Service role only. No policies: nothing in an authenticated session reads or
-- writes raw provider payloads.
alter table public.webhook_events enable row level security;
