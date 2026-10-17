-- Owner Messages (ADR 0039): Kululu messaging the Owner who created the Event -
-- a Welcome the first time the Event is paid, and a Post-event note the day
-- after it. They are not Schedules, so they get their own log rather than
-- borrowing message_deliveries, which is per Guest.
--
-- One row per send, or per send that was due and expired. The automatic send of
-- each kind happens at most once per Event, which the partial unique index
-- enforces; an Operator's "send now" (sent_by set) is outside it and may repeat.
--
-- The Welcome is queued here, by a trigger on the billing log, so every path that
-- records the first payment queues it - the Back Office today, a payment webhook
-- later. "First" means no earlier paid row for the Event: a top-up, or a payment
-- after `canceled`, never queues another, and Events already paid when this ships
-- never queue one at all, which is what ADR 0039 asks for. The Post-event note is
-- never queued ahead of time, because the Event date can still move; the Sweeper
-- works out when it is due on every pass.

create type public.owner_message_kind as enum ('welcome', 'post_event');

create table public.owner_messages (
  id                  uuid        primary key default gen_random_uuid(),
  event_id            uuid        not null references public.events (id) on delete cascade,
  kind                public.owner_message_kind not null,
  -- Null for the automatic send; the Operator who pressed "send now" otherwise.
  sent_by             uuid        null references auth.users (id) on delete set null,
  -- When it was meant to go out. Judged against the 48-hour lateness rule.
  due_at              timestamptz not null default now(),
  -- 'pending'  queued, not yet claimed (only a Welcome waits like this)
  -- 'sending'  claimed, the provider call is in flight (ADR 0014)
  -- 'accepted' / 'delivered' / 'read' - as Meta reports it
  -- 'failed'   refused by Meta, or no phone to send to
  -- 'unknown'  no answer from Meta; never retried, it may have gone out
  -- 'expired'  more than 48 hours late, never sent
  status              text        not null default 'pending'
    check (status in ('pending', 'sending', 'accepted', 'delivered', 'read', 'failed', 'unknown', 'expired')),
  recipient_user_id   uuid        null references auth.users (id) on delete set null,
  phone_number        text        null,
  external_message_id text        null,
  error_message       text        null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.owner_messages is
  'Owner Messages (ADR 0039): Kululu messaging the Event creator. Not Schedules, not per Guest.';

create unique index owner_messages_automatic_once
  on public.owner_messages (event_id, kind)
  where sent_by is null;

create index idx_owner_messages_event on public.owner_messages (event_id, created_at desc);

create index idx_owner_messages_pending on public.owner_messages (due_at)
  where status = 'pending';

create trigger owner_messages_set_updated_at
  before update on public.owner_messages
  for each row execute function public.set_updated_at();

-- Service role only: the Sweeper sends, the Back Office reads through the
-- service client. Nobody signed in reads or writes it directly.
alter table public.owner_messages enable row level security;

-- The Visitor decision (ADR 0028). With no permissive policy nobody passes
-- anyway; this says so explicitly, because the table reaches people.
create policy "Visitors cannot read" on public.owner_messages
  as restrictive for select to authenticated
  using ((select public.is_visitor()) is false);

-- --------------------------------------------------------------------------
-- Queue the Welcome on the Event's first payment
-- --------------------------------------------------------------------------

create or replace function public.queue_owner_welcome()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.to_status = 'paid' and not exists (
    select 1
    from public.event_billing_events e
    where e.event_id = new.event_id
      and e.to_status = 'paid'
      and e.id <> new.id
  ) then
    insert into public.owner_messages (event_id, kind, due_at)
    values (new.event_id, 'welcome', now())
    on conflict (event_id, kind) where sent_by is null do nothing;
  end if;
  return new;
end;
$$;

create trigger event_billing_events_queue_owner_welcome
  after insert on public.event_billing_events
  for each row execute function public.queue_owner_welcome();

-- --------------------------------------------------------------------------
-- Claim an automatic send
-- --------------------------------------------------------------------------

-- Claims the automatic send of one kind for one Event, before it is made
-- (ADR 0014). Inserts it, or takes over a pending one, moving it to p_status:
-- 'sending' to send it now, or 'expired' to record that it never will be.
-- Returns the row id when this call won the claim, null when the send was
-- already claimed, made or expired.
create or replace function public.claim_owner_message(
  p_event_id uuid,
  p_kind     public.owner_message_kind,
  p_due_at   timestamptz,
  p_status   text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_status not in ('sending', 'expired') then
    raise exception 'claim_owner_message: status must be sending or expired, got %', p_status;
  end if;

  insert into public.owner_messages (event_id, kind, due_at, status)
  values (p_event_id, p_kind, p_due_at, p_status)
  on conflict (event_id, kind) where sent_by is null
  do update set status = excluded.status
    where public.owner_messages.status = 'pending'
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.claim_owner_message(uuid, public.owner_message_kind, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.claim_owner_message(uuid, public.owner_message_kind, timestamptz, text)
  to service_role;

revoke execute on function public.queue_owner_welcome() from public, anon, authenticated;
