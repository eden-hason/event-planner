-- Joining through a Co-planner Link failed for everyone who signed in by phone.
--
-- join_event_by_co_planner_link (20261018000001) creates the joiner's profile
-- from auth.users, copying auth.users.phone straight into
-- profiles.phone_number. Supabase Auth stores the phone as E.164 digits with no
-- leading '+' (all 72 phone users in production), and
-- profiles_phone_number_e164 requires the '+', so the insert raised and the
-- link page showed "we couldn't add you to the event". Google sign-ins have no
-- phone and were unaffected.
--
-- The phone gains its '+' here. Anything that still does not look like E.164
-- is stored as null rather than refused: a phone number on the profile is not
-- worth failing the join over.

create or replace function public.join_event_by_co_planner_link(p_token text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
  v_inserted int;
begin
  if v_user_id is null then
    return json_build_object('success', false, 'reason', 'not_signed_in');
  end if;

  -- A Visitor has a session but no account to plan with (ADR 0028).
  if public.is_visitor() then
    return json_build_object('success', false, 'reason', 'visitor');
  end if;

  select l.event_id into v_event_id
  from public.co_planner_links l
  where l.token = p_token;

  if v_event_id is null then
    return json_build_object('success', false, 'reason', 'not_found');
  end if;

  -- event_collaborators FKs to profiles, which signup no longer creates.
  -- auth.users.phone has no leading '+'; profiles.phone_number must have one.
  insert into public.profiles (id, email, phone_number)
  select u.id, u.email, phone.e164
  from auth.users u
  cross join lateral (
    select case
      when '+' || ltrim(u.phone, '+') ~ '^\+[1-9][0-9]{1,14}$' then '+' || ltrim(u.phone, '+')
    end as e164
  ) phone
  where u.id = v_user_id
  on conflict (id) do nothing;

  insert into public.event_collaborators (event_id, user_id, role, is_creator)
  values (v_event_id, v_user_id, 'owner', false)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    insert into public.collaboration_audit_log (event_id, actor_id, action, metadata)
    values (v_event_id, v_user_id, 'joined', json_build_object('via', 'co_planner_link')::jsonb);
  end if;

  return json_build_object(
    'success', true,
    'event_id', v_event_id,
    'joined', v_inserted > 0
  );
end;
$$;

revoke all on function public.join_event_by_co_planner_link(text) from public, anon;
grant execute on function public.join_event_by_co_planner_link(text) to authenticated;
