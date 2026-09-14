-- Two new Home capabilities need state the schema did not have.
--
-- Live Invite Preview Link: the guest-facing RSVP page is only reachable through
-- a real Guest's invitation_token, and anything done there writes that Guest's
-- RSVP. A preview must never do that, so the event gets its own token that
-- opens the same page in a mode that writes nothing. It is separate from
-- short_code (already public in every SMS nav link) so it can be rotated on its
-- own later.
--
-- Test Message: the Owner receives a copy of a real Schedule message on their own
-- phone. Each send costs a real WhatsApp message, so sends are logged and capped
-- at 3 accepted sends per event for its whole life. The log also answers "has
-- this viewer already received a test", which retires the Featured Action. Test
-- sends never touch message_deliveries: they are not Deliveries and have no
-- effect on any Guest's history.

-- --------------------------------------------------------------------------
-- events.preview_token
-- --------------------------------------------------------------------------

alter table public.events
  add column preview_token uuid not null default gen_random_uuid();

create unique index events_preview_token_key on public.events (preview_token);

comment on column public.events.preview_token is
  'Opens /p/[token]: the guest-facing RSVP page with a sample guest, writing nothing. Never a Guest''s invitation_token.';

-- --------------------------------------------------------------------------
-- test_messages
-- --------------------------------------------------------------------------

create table public.test_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  schedule_id uuid references public.schedules (id) on delete set null,
  phone_number text not null,
  -- 'pending' is a reservation held while the provider call is in flight, so
  -- two concurrent sends cannot both slip under the cap.
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'failed')),
  external_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index test_messages_event_id_idx on public.test_messages (event_id);

alter table public.test_messages enable row level security;

-- Readable by the event's Owners only: a row holds the phone number a test went
-- to, which a Seating Manager has no reason to see. Written only by the server
-- (service role) through reserve_test_message below.
create policy test_messages_select on public.test_messages
  for select to authenticated
  using (public.user_is_event_owner(event_id));

-- Reserves one send against the per-event cap, or returns null when the cap is
-- reached. Locks the event row so the count and the insert are atomic.
create or replace function public.reserve_test_message(
  p_event_id uuid,
  p_user_id uuid,
  p_schedule_id uuid,
  p_phone_number text,
  p_cap integer default 3
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
  v_id uuid;
begin
  perform 1 from public.events where id = p_event_id for update;

  -- A pending row older than 5 minutes is a send that crashed mid-flight; it
  -- should not hold a slot forever.
  select count(*) into v_used
    from public.test_messages
   where event_id = p_event_id
     and (status = 'accepted'
          or (status = 'pending' and created_at > now() - interval '5 minutes'));

  if v_used >= p_cap then
    return null;
  end if;

  insert into public.test_messages (event_id, user_id, schedule_id, phone_number)
  values (p_event_id, p_user_id, p_schedule_id, p_phone_number)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.reserve_test_message(uuid, uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_test_message(uuid, uuid, uuid, text, integer) to service_role;

-- --------------------------------------------------------------------------
-- Guard
-- --------------------------------------------------------------------------

-- The RSVP page tries a Guest's invitation_token before an event's
-- preview_token, so a collision would open a real Guest's page from a preview
-- link and let whoever holds it answer for them.
do $$
begin
  if exists (
    select 1
      from public.events e
      join public.guests g on g.invitation_token = e.preview_token
  ) then
    raise exception 'an event preview_token collides with a guest invitation_token';
  end if;
end;
$$;
