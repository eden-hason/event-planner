-- Split a Delivery from its Delivery Attempts.
--
-- message_deliveries holds one row per guest per schedule, and every send path
-- upserted onto it. So an SMS fallback or an Operator resend overwrote the
-- WhatsApp record: its status, its error, and the confirmation_token that the
-- earlier message's RSVP link resolves through - a resend silently broke the
-- link in the message the guest already had.
--
-- From here on:
--   * message_deliveries is the Delivery - one per guest per schedule. It keeps
--     the confirmation_token and a status rolled up from its attempts.
--   * message_delivery_attempts is one message on one channel. Never
--     overwritten by a later attempt; provider statuses (the WhatsApp webhook)
--     land here.
--
-- The roll-up is "best attempt wins": read > delivered > sent > failed. A later
-- attempt that fails never takes back a guest who was already reached. That is
-- deliberately not the in-attempt ranking the webhook uses (where failed is
-- terminal and outranks everything) - the two answer different questions. It
-- lives in a trigger so no writer can forget it. See docs/adr/0011 and
-- CONTEXT.md (Delivery, Delivery Attempt).
--
-- The name message_deliveries is kept on purpose: fourteen readers and its RLS
-- policies depend on it, and there is no sandbox between local and production.

-- --------------------------------------------------------------------------
-- The attempts table
-- --------------------------------------------------------------------------

create table public.message_delivery_attempts (
  id                  uuid        primary key default gen_random_uuid(),
  delivery_id         uuid        not null references public.message_deliveries (id) on delete cascade,
  channel             public.delivery_method not null,
  status              public.delivery_status not null default 'pending',
  template_id         uuid        null references public.message_templates (id),
  -- The wamid for WhatsApp, the ActiveTrail message id for SMS.
  external_message_id varchar(255) null,
  error_code          integer     null,
  error_message       text        null,
  -- 'fallback' marks an SMS Fallback launched from the Back Office.
  triggered_by        text        not null default 'scheduled',
  sent_at             timestamptz null,
  delivered_at        timestamptz null,
  read_at             timestamptz null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint message_delivery_attempts_triggered_by_check
    check (triggered_by in ('scheduled', 'manual', 'fallback')),
  -- An attempt is a message that was tried. "Not sent" belongs to a Delivery
  -- with no attempts at all.
  constraint message_delivery_attempts_status_check
    check (status <> 'not_sent'),
  constraint message_delivery_attempts_sent_at_check
    check (status <> 'sent' or sent_at is not null)
);

comment on table public.message_delivery_attempts is
  'One try at delivering a schedule''s message to one guest over one channel. The parent message_deliveries row rolls these up (best attempt wins).';

create index message_delivery_attempts_delivery_id_idx
  on public.message_delivery_attempts (delivery_id);

create index message_delivery_attempts_template_id_idx
  on public.message_delivery_attempts (template_id);

-- The webhook looks attempts up by provider id. Unique per channel because a
-- provider id identifies exactly one outgoing message; partial because an
-- attempt the provider rejected outright has none.
create unique index message_delivery_attempts_external_message_id_key
  on public.message_delivery_attempts (channel, external_message_id)
  where external_message_id is not null;

-- At most one SMS Fallback per delivery. The fallback claims a delivery by
-- inserting its attempt before the SMS goes out, so two Operators pressing the
-- button together cannot both send - the second insert conflicts and skips.
create unique index message_delivery_attempts_one_fallback_key
  on public.message_delivery_attempts (delivery_id)
  where triggered_by = 'fallback';

create trigger update_message_delivery_attempts_updated_at
  before update on public.message_delivery_attempts
  for each row execute function public.update_updated_at_column();

-- --------------------------------------------------------------------------
-- RLS - mirrors message_deliveries: the event owner reads and writes (an
-- owner-triggered send runs under their session); the service role bypasses.
-- --------------------------------------------------------------------------

alter table public.message_delivery_attempts enable row level security;

create policy "Owners can view attempts for their events"
  on public.message_delivery_attempts for select to authenticated
  using (
    exists (
      select 1
      from public.message_deliveries d
      join public.schedules s on s.id = d.schedule_id
      join public.events e on e.id = s.event_id
      where d.id = message_delivery_attempts.delivery_id
        and e.user_id = (select auth.uid())
    )
  );

create policy "Owners can insert attempts for their schedules"
  on public.message_delivery_attempts for insert to authenticated
  with check (
    exists (
      select 1
      from public.message_deliveries d
      join public.schedules s on s.id = d.schedule_id
      join public.events e on e.id = s.event_id
      where d.id = message_delivery_attempts.delivery_id
        and e.user_id = (select auth.uid())
    )
  );

create policy "Owners can update attempts for their schedules"
  on public.message_delivery_attempts for update to authenticated
  using (
    exists (
      select 1
      from public.message_deliveries d
      join public.schedules s on s.id = d.schedule_id
      join public.events e on e.id = s.event_id
      where d.id = message_delivery_attempts.delivery_id
        and e.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.message_deliveries d
      join public.schedules s on s.id = d.schedule_id
      join public.events e on e.id = s.event_id
      where d.id = message_delivery_attempts.delivery_id
        and e.user_id = (select auth.uid())
    )
  );

-- --------------------------------------------------------------------------
-- Backfill: every existing delivery was exactly one attempt
-- --------------------------------------------------------------------------
-- Runs before the roll-up trigger exists, so it does not rewrite 160+ parents
-- with the values they already hold.

insert into public.message_delivery_attempts (
  delivery_id, channel, status, template_id, external_message_id,
  error_code, error_message, triggered_by, sent_at, delivered_at, read_at,
  created_at
)
select
  d.id,
  d.delivery_method::public.delivery_method,
  coalesce(d.status, 'pending'),
  d.template_id,
  d.external_message_id,
  d.error_code,
  d.error_message,
  d.triggered_by,
  d.sent_at,
  d.delivered_at,
  d.read_at,
  coalesce(d.sent_at, d.created_at, now())
from public.message_deliveries d;

-- --------------------------------------------------------------------------
-- The parent's provider id is now a mirror of its best attempt, not an
-- identity. Two attempts on different channels may in principle share an id
-- string, so the global uniqueness moves to the attempts table (per channel).
-- --------------------------------------------------------------------------

drop index if exists public.message_deliveries_external_message_id_key;

comment on column public.message_deliveries.status is
  'Rolled up from message_delivery_attempts (best attempt wins), or not_sent when the guest had no usable phone. Do not write directly once attempts exist.';
comment on column public.message_deliveries.delivery_method is
  'The channel of the best attempt - the one that reached the guest, when any did.';
comment on column public.message_deliveries.external_message_id is
  'Mirror of the best attempt''s provider id. Look attempts up on message_delivery_attempts instead.';

-- --------------------------------------------------------------------------
-- The roll-up
-- --------------------------------------------------------------------------
-- Security definer so the parent is kept in step whichever role wrote the
-- attempt. It only ever touches the one delivery the attempt belongs to.

create or replace function public.roll_up_message_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_best public.message_delivery_attempts;
begin
  -- Serialise roll-ups of the same delivery. Two webhook notifications for two
  -- attempts of one guest can land together; without the lock each could pick
  -- its "best" from a snapshot missing the other's write.
  perform 1 from public.message_deliveries where id = new.delivery_id for update;

  select a.* into v_best
  from public.message_delivery_attempts a
  where a.delivery_id = new.delivery_id
  order by
    case a.status
      when 'read' then 4
      when 'delivered' then 3
      when 'sent' then 2
      when 'failed' then 1
      else 0
    end desc,
    a.created_at desc
  limit 1;

  update public.message_deliveries d
  set status              = v_best.status,
      delivery_method     = v_best.channel::text,
      template_id         = coalesce(v_best.template_id, d.template_id),
      external_message_id = v_best.external_message_id,
      sent_at             = v_best.sent_at,
      delivered_at        = v_best.delivered_at,
      read_at             = v_best.read_at,
      error_code          = case when v_best.status = 'failed' then v_best.error_code end,
      error_message       = case when v_best.status = 'failed' then v_best.error_message end
  where d.id = new.delivery_id;

  return null;
end;
$$;

revoke execute on function public.roll_up_message_delivery() from public, anon, authenticated;

comment on function public.roll_up_message_delivery() is
  'Keeps message_deliveries in step with its best attempt: read > delivered > sent > failed, latest wins a tie.';

create trigger roll_up_message_delivery
  after insert or update on public.message_delivery_attempts
  for each row execute function public.roll_up_message_delivery();

-- --------------------------------------------------------------------------
-- Guard: every delivery landed as exactly one attempt
-- --------------------------------------------------------------------------

do $$
declare
  v_deliveries bigint;
  v_attempts   bigint;
  v_orphans    bigint;
begin
  select count(*) into v_deliveries from public.message_deliveries;
  select count(*) into v_attempts from public.message_delivery_attempts;
  select count(*) into v_orphans
  from public.message_deliveries d
  where not exists (
    select 1 from public.message_delivery_attempts a where a.delivery_id = d.id
  );

  if v_attempts <> v_deliveries or v_orphans > 0 then
    raise exception
      'message_delivery_attempts: backfilled % attempt(s) for % deliveries, % delivery(ies) without one',
      v_attempts, v_deliveries, v_orphans;
  end if;
end $$;
