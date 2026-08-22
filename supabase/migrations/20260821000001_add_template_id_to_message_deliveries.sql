-- Record which template each guest actually received.
--
-- A single event_reminder send can now use two different templates: the table
-- number is per-guest data, so a guest with no table_id gets the row whose
-- requires_table_numbers is false while everyone else gets the true one.
-- schedules.template_id therefore cannot record "what went out" - it names the
-- family, not the message - and reconstructing the choice after the fact would
-- read the event's *current* configuration, which is exactly the thing that
-- changes between scheduling and sending.
--
-- message_deliveries already keeps per-delivery truth that diverges from the
-- schedule: delivery_method records 'sms' on rows whose schedule pointed at a
-- WhatsApp template, because the fallback path in send-helpers.ts downgraded
-- the channel. template_id follows that established pattern.
--
-- Nullable, with no backfill: historical rows predate multi-template sends and
-- inventing a value for them would assert something we cannot know.

alter table public.message_deliveries
  add column template_id uuid references public.message_templates (id);

comment on column public.message_deliveries.template_id is
  'The template this guest actually received. Null for deliveries predating per-guest template resolution.';

create index message_deliveries_template_id_idx
  on public.message_deliveries (template_id);
