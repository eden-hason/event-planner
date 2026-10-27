-- The Test Message is now offered to every Owner, paid or not, and may go to a
-- number the Owner types (ADR 0047). Creating an Event is free, so the cap of
-- three per Event bounded nothing: a new Event brought three new sends. An
-- account now gets three across all its Events as well.
--
-- "One per viewer per Event" was only an eligibility rule on Home. It moves
-- into the reservation too, so a second tab or a replayed request cannot spend
-- the Event's allowance twice for the same person.
--
-- Home counts the viewer's own sends across all their Events to know whether
-- to offer one, which the owner-only select policy cannot answer for an Event
-- they are no longer an Owner of. A second policy lets a user read their own
-- rows.

create policy test_messages_select_own on public.test_messages
  for select to authenticated
  using (user_id = (select auth.uid()));

create index test_messages_user_id_idx on public.test_messages (user_id);

drop function public.reserve_test_message(uuid, uuid, uuid, text, integer);

-- Reserves one send, or returns null when any cap is reached: the Event's,
-- the account's, or the viewer having already received one on this Event.
create function public.reserve_test_message(
  p_event_id uuid,
  p_user_id uuid,
  p_schedule_id uuid,
  p_phone_number text,
  p_cap integer default 3,
  p_account_cap integer default 3
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_used integer;
  v_account_used integer;
  v_viewer_used integer;
  v_id uuid;
begin
  -- The event row serializes sends on one Event; the advisory lock serializes
  -- one account's sends across its Events. Taken in this order everywhere.
  perform 1 from public.events where id = p_event_id for update;
  perform pg_advisory_xact_lock(hashtext('test_messages:' || p_user_id::text));

  -- A pending row older than 5 minutes is a send that crashed mid-flight; it
  -- should not hold a slot forever.
  select
    count(*) filter (where event_id = p_event_id),
    count(*) filter (where user_id = p_user_id),
    count(*) filter (where event_id = p_event_id and user_id = p_user_id)
    into v_event_used, v_account_used, v_viewer_used
    from public.test_messages
   where (event_id = p_event_id or user_id = p_user_id)
     and (status = 'accepted'
          or (status = 'pending' and created_at > now() - interval '5 minutes'));

  if v_event_used >= p_cap or v_account_used >= p_account_cap or v_viewer_used > 0 then
    return null;
  end if;

  insert into public.test_messages (event_id, user_id, schedule_id, phone_number)
  values (p_event_id, p_user_id, p_schedule_id, p_phone_number)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.reserve_test_message(uuid, uuid, uuid, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_test_message(uuid, uuid, uuid, text, integer, integer)
  to service_role;
