-- A co-planner joins an Event through its Co-planner Link, not an email
-- invitation (ADR 0041).
--
-- The email invitation could be accepted only by a Google sign-in whose email
-- matched it, and most Owners sign in by phone, so 8 of the 15 invitations
-- ever sent were never accepted. Each Event now has one Co-planner Link:
-- whoever opens it and signs in, by any method, becomes an Owner. It is not
-- addressed to anyone, can be used by more than one person, never expires and
-- cannot be reset (backlog 0026 is the gap that leaves). There is no cap on
-- Owners.
--
-- The Seating Manager role goes with it. Production never had one - not a
-- collaborator, not an invitation - so Owner is the only collaborator role.
-- The enum keeps its old value (Postgres cannot drop one without rebuilding
-- every policy that casts to it); a check constraint holds the column to
-- 'owner' instead.
--
-- Deploy the app before pushing this: the live code still reads
-- collaboration_invitations, collaborator_guest_scope and the visible_*
-- columns of event_table_occupancy.

-- ---------------------------------------------------------------------------
-- 0. Refuse if anyone is still a Seating Manager. Dropping their scope would
--    silently turn them into nothing.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from public.event_collaborators where role = 'seating_manager') then
    raise exception 'event_collaborators still has seating_manager rows; ADR 0041 assumed none';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. The Co-planner Link
-- ---------------------------------------------------------------------------

-- Its own table rather than a column on events, so the token never rides
-- along on a `select *` of an Event - several guest-facing reads do that.
--
-- Every Event has its link from the moment it exists, made by a trigger rather
-- than on first use: "Send on WhatsApp" must open in the same tap that asks for
-- it, and a browser blocks a window opened after waiting on the server.
create table public.co_planner_links (
  event_id uuid primary key references public.events (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  -- Whose name the link's page shows as the inviter: the Event's creator.
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.co_planner_links is
  'One Co-planner Link per Event (ADR 0041). Whoever signs in through the token becomes an Owner. Never reset or expired by design (backlog 0026).';

alter table public.co_planner_links enable row level security;

-- Read-only to the Event's collaborators. Rows are written by the trigger
-- below, and there is no update or delete: the link cannot be reset.
create policy co_planner_links_select on public.co_planner_links
  for select to authenticated
  using (public.user_has_event_access(event_id));

-- Inviting reaches a person, so a Visitor saves first (ADR 0028). Their Event
-- has a link all along; it becomes readable once they save.
create policy "Visitors cannot select" on public.co_planner_links
  as restrictive for select to authenticated
  using ((select public.is_visitor()) is false);

create or replace function public.create_co_planner_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.co_planner_links (event_id, created_by)
  values (new.id, new.user_id)
  on conflict (event_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_co_planner_link() from public, anon, authenticated;

create trigger create_co_planner_link
  after insert on public.events
  for each row execute function public.create_co_planner_link();

insert into public.co_planner_links (event_id, created_by)
select e.id, e.user_id
from public.events e
on conflict (event_id) do nothing;

-- What the link's page shows before anyone signs in: whose Event, and who
-- shared it. SECURITY DEFINER because the reader is not a collaborator yet,
-- and may not be signed in at all. The token is the only key.
create or replace function public.get_co_planner_link_preview(p_token text)
returns table (event_id uuid, event_title text, inviter_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.title, nullif(btrim(p.full_name), '')
  from public.co_planner_links l
  join public.events e on e.id = l.event_id
  left join public.profiles p on p.id = l.created_by
  where l.token = p_token
  limit 1
$$;

revoke all on function public.get_co_planner_link_preview(text) from public;
grant execute on function public.get_co_planner_link_preview(text) to anon, authenticated;

alter type public.audit_action add value if not exists 'joined';

-- Joins the caller to the link's Event as an Owner. Already planning it is
-- not an error: the caller simply lands on the Event.
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
  insert into public.profiles (id, email, phone_number)
  select u.id, u.email, u.phone
  from auth.users u
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

-- ---------------------------------------------------------------------------
-- 2. The email invitation is gone
-- ---------------------------------------------------------------------------

drop function if exists public.accept_collaboration_invitation(text);
drop function if exists public.get_invitation_by_token(text);
drop table public.collaboration_invitations;
drop type public.invitation_status;

-- ---------------------------------------------------------------------------
-- 3. Seating Manager is gone
-- ---------------------------------------------------------------------------

drop policy guests_update_seating_manager on public.guests;

drop policy guests_select on public.guests;
create policy guests_select on public.guests
  as permissive
  for select
  to authenticated
  using (
    event_id in (select events.id from public.events where events.user_id = auth.uid())
    or public.user_is_event_owner(event_id)
  );

drop trigger tables_delete_guard on public.tables;
drop function public.tables_delete_guard();

-- The visible_* columns existed so a scoped collaborator saw truthful capacity
-- without the names behind it. Every collaborator now sees every Guest Record,
-- so occupancy is just the totals. The return type changes, hence drop/create.
drop function public.event_table_occupancy(uuid);
create function public.event_table_occupancy(p_event_id uuid)
returns table (table_id uuid, confirmed_heads integer, pending_heads integer, record_count integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  -- The Back Office reaches an Event through the service client while
  -- impersonating, so auth.uid() is null there. It already bypasses RLS
  -- everywhere else; refusing it here would render every Table empty rather
  -- than deny anything.
  v_service boolean := auth.role() = 'service_role';
begin
  if not (
    v_service
    or exists (select 1 from public.events e where e.id = p_event_id and e.user_id = auth.uid())
    or public.user_has_event_access(p_event_id)
  ) then
    raise exception 'not authorized for event %', p_event_id using errcode = '42501';
  end if;

  return query
  select
    t.id,
    coalesce(sum(case when g.rsvp_status = 'confirmed' then coalesce(g.amount, 1) end), 0)::int,
    coalesce(sum(case when g.rsvp_status = 'pending'   then coalesce(g.amount, 1) end), 0)::int,
    count(g.id)::int
  from public.tables t
  left join public.guests g
    on g.table_id = t.id
   and g.rsvp_status <> 'declined'
  where t.event_id = p_event_id
  group by t.id;
end;
$function$;

revoke all on function public.event_table_occupancy(uuid) from public, anon;
grant execute on function public.event_table_occupancy(uuid) to authenticated, service_role;

drop function public.guest_in_collaborator_scope(uuid, uuid, uuid);
drop table public.collaborator_guest_scope;

alter table public.event_collaborators
  add constraint event_collaborators_role_is_owner check (role = 'owner');

-- ---------------------------------------------------------------------------
-- 4. Refuse to land half-built
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.collaboration_invitations') is not null
     or to_regclass('public.collaborator_guest_scope') is not null then
    raise exception 'the email invitation or Seating Manager scope tables survived';
  end if;
  if exists (select 1 from pg_policies where tablename = 'guests'
             and (coalesce(qual, '') || coalesce(with_check, '')) like '%seating_manager%') then
    raise exception 'a guests policy still mentions seating_manager';
  end if;
  if to_regclass('public.co_planner_links') is null
     or to_regprocedure('public.join_event_by_co_planner_link(text)') is null
     or to_regprocedure('public.get_co_planner_link_preview(text)') is null then
    raise exception 'the Co-planner Link did not land';
  end if;
  if exists (select 1 from public.events e
             where not exists (select 1 from public.co_planner_links l where l.event_id = e.id)) then
    raise exception 'an Event was left without a Co-planner Link';
  end if;
end $$;
