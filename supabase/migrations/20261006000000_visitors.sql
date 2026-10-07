-- A Visitor plans freely and saves to reach out (ADR 0028).
--
-- Anonymous sign-in gives a Visitor a real auth user, so they can create and
-- plan an Event before they have an account. Postgres cannot tell that user
-- apart from an Owner: both are `authenticated`, and only the `is_anonymous`
-- claim in the JWT differs. Every policy in this schema would grant a Visitor
-- what it grants an Owner.
--
-- Planning is meant to be open to them - guests, groups, seating, budget,
-- schedules. What is not is anything that reaches a person outside Kululu or
-- costs money: collaborators and invitations, Test Messages, deliveries,
-- payments, WhatsApp import. Those tables get a RESTRICTIVE policy on the
-- claim. Restrictive policies are ANDed with the permissive ones, so no
-- existing policy changes and permanent users are unaffected.
--
-- Sending itself runs server-side (the Dispatcher, service role) where RLS does
-- not apply. That gate is in the app; see ADR 0028.
--
-- Every table with RLS must be decided one way or the other: either it carries
-- a restrictive is_visitor policy, or it is listed in `visitor_open_tables()`.
-- The guard at the end, and `supabase/seeds/visitor-guard.sql` on every later
-- `db reset`, fail on a table that is neither - so a new table cannot quietly
-- become something a Visitor can write.
--
-- Also here: Visitors get a profile row (the creator's collaborator row, which
-- opens the workspace, references `profiles`), flagged so the back office can
-- leave them out; and the purge for Visitors who never save.

-- --------------------------------------------------------------------------
-- Who is a Visitor
-- --------------------------------------------------------------------------

create or replace function public.is_visitor()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

comment on function public.is_visitor() is
  'True when the caller is a Visitor: an anonymous user who has not saved their Event yet (ADR 0028).';

-- --------------------------------------------------------------------------
-- Visitors have a profile, flagged
-- --------------------------------------------------------------------------

alter table public.profiles
  add column is_visitor boolean not null default false;

comment on column public.profiles.is_visitor is
  'Mirrors auth.users.is_anonymous: a Visitor who has not saved yet (ADR 0028). Maintained by triggers on auth.users; not writable by users.';

-- Created with the anonymous user rather than by the app, so the row exists
-- before the first event insert needs it. Saving flips the flag through the
-- update trigger below; the name and phone are written by the app at the same
-- time.
create or replace function public.sync_visitor_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_anonymous then
      insert into public.profiles (id, is_visitor)
      values (new.id, true)
      on conflict (id) do update set is_visitor = true;
    end if;
  elsif new.is_anonymous is distinct from old.is_anonymous then
    update public.profiles set is_visitor = new.is_anonymous where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_visitor_sync
  after insert or update of is_anonymous on auth.users
  for each row execute function public.sync_visitor_profile();

-- --------------------------------------------------------------------------
-- Outward-facing tables: closed to Visitors
-- --------------------------------------------------------------------------

-- Reads stay open where the workspace needs them (who the collaborators are,
-- the Test Messages left, delivery outcomes); writes are closed.
do $$
declare
  t text;
  cmd text;
begin
  foreach t in array array[
    'event_collaborators',
    'collaboration_invitations',
    'collaborator_guest_scope',
    'collaboration_audit_log',
    'test_messages',
    'message_deliveries',
    'message_delivery_attempts',
    'event_billing_events',
    'whatsapp_import_sessions',
    'call_rounds',
    'call_logs',
    'guest_interactions',
    'event_types',
    'event_type_default_schedules',
    'message_templates',
    'schedule_types'
  ] loop
    foreach cmd in array array['insert', 'update', 'delete'] loop
      execute format(
        'create policy %I on public.%I as restrictive for %s to authenticated %s',
        'Visitors cannot ' || cmd,
        t,
        cmd,
        case cmd
          when 'insert' then 'with check ((select public.is_visitor()) is false)'
          else 'using ((select public.is_visitor()) is false)'
        end
      );
    end loop;
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- Planning tables: open to Visitors, by decision
-- --------------------------------------------------------------------------

-- The tables a Visitor may use like an Owner. Being listed here is the
-- decision; the guard below treats every RLS table that is neither listed nor
-- carrying a restrictive is_visitor policy as a mistake.
--
-- The internal tables (locks, dispatch attempts, webhook inbox, inbound
-- WhatsApp) have no `authenticated` policy at all, so RLS already denies a
-- Visitor everything; they are listed so the guard does not flag them.
create or replace function public.visitor_open_tables()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    -- planning
    'events',
    'guests',
    'groups',
    'tables',
    'expenses',
    'gifts',
    'schedules',
    'profiles',
    -- no authenticated access for anyone
    'event_reached_records',
    'pipeline_locks',
    'schedule_dispatch_attempts',
    'webhook_events',
    'whatsapp_inbound_messages'
  ]::text[]
$$;

comment on function public.visitor_open_tables() is
  'Tables a Visitor may use like an Owner (ADR 0028). Every other RLS table needs a restrictive is_visitor policy.';

-- `profiles` is open, but the flag is not the user's to change. The table's
-- grants are already per column (is_admin is not granted either), so the new
-- column is simply never granted.

-- --------------------------------------------------------------------------
-- A Visitor's Event never sends
-- --------------------------------------------------------------------------

-- Sending runs on the service role, where none of the policies above apply,
-- and it is gated on `billing_status = 'paid'` (can_create_schedules). So that
-- is where the line holds: a Visitor's Event cannot become paid. An Operator
-- recording a payment for someone who never saved is refused here - they save
-- first, then pay.
create or replace function public.refuse_paid_visitor_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.billing_status = 'paid'
     and exists (select 1 from auth.users u where u.id = new.user_id and u.is_anonymous) then
    raise exception 'This Event belongs to a Visitor who has not saved it yet; it cannot be paid'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger refuse_paid_visitor_event
  before insert or update of billing_status on public.events
  for each row execute function public.refuse_paid_visitor_event();

-- --------------------------------------------------------------------------
-- Forgetting a Visitor
-- --------------------------------------------------------------------------

-- Deletes a Visitor and their Event. Events go first, explicitly: deleting the
-- auth user alone would cascade to them too, but the creator's collaborator row
-- references the user through a no-action key (event_collaborators_user_id_fkey)
-- that is checked before that cascade gets to it, and the delete fails.
--
-- Refuses anyone who is not anonymous, so a stale or forged id can never
-- remove a real account. Used by the purge below and by the app when a Visitor
-- signs in to an account that already exists.
create or replace function public.forget_visitor(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from auth.users where id = p_user_id and is_anonymous) then
    return false;
  end if;
  delete from public.events where user_id = p_user_id;
  delete from public.event_collaborators where user_id = p_user_id;
  delete from auth.users where id = p_user_id and is_anonymous;
  return true;
end;
$$;

revoke all on function public.forget_visitor(uuid) from public, anon, authenticated;
grant execute on function public.forget_visitor(uuid) to service_role;

-- --------------------------------------------------------------------------
-- Forgetting Visitors who never saved
-- --------------------------------------------------------------------------

-- A Visitor is idle once neither they nor anything in their Event has changed
-- for 30 days. "Anything" is the planning tables they can write: the event row,
-- guests, groups, seating, budget, gifts, schedules. Capped per call so one
-- Sweeper pass stays short; the rest goes on the next pass.
create or replace function public.purge_abandoned_visitors(p_limit integer default 200)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  with visitor_activity as (
    select
      u.id,
      greatest(
        u.created_at,
        u.updated_at,
        (select max(x.at) from (
          select e.updated_at as at from public.events e where e.user_id = u.id
          union all
          select g.updated_at from public.guests g join public.events e on e.id = g.event_id where e.user_id = u.id
          union all
          select gr.updated_at from public.groups gr join public.events e on e.id = gr.event_id where e.user_id = u.id
          union all
          select t.updated_at from public.tables t join public.events e on e.id = t.event_id where e.user_id = u.id
          union all
          select x.updated_at from public.expenses x join public.events e on e.id = x.event_id where e.user_id = u.id
          union all
          select gi.updated_at from public.gifts gi join public.events e on e.id = gi.event_id where e.user_id = u.id
          union all
          select s.updated_at from public.schedules s join public.events e on e.id = s.event_id where e.user_id = u.id
        ) x)
      ) as last_active
    from auth.users u
    -- last_active is a greatest() over these too, so a Visitor newer than 30
    -- days can never qualify: skip their activity scan. The Sweeper runs this
    -- every few minutes.
    where u.is_anonymous
      and u.created_at < now() - interval '30 days'
      and u.updated_at < now() - interval '30 days'
  ),
  abandoned as (
    select id from visitor_activity
    where last_active < now() - interval '30 days'
    limit p_limit
  )
  select count(*) filter (where public.forget_visitor(a.id))
  into v_deleted
  from abandoned a;

  return v_deleted;
end;
$$;

revoke all on function public.purge_abandoned_visitors(integer) from public, anon, authenticated;
grant execute on function public.purge_abandoned_visitors(integer) to service_role;

comment on function public.purge_abandoned_visitors(integer) is
  'Deletes anonymous users (Visitors) idle for 30 days; their Event and everything under it cascades. Run by the Sweeper (ADR 0028).';

-- --------------------------------------------------------------------------
-- Guard
-- --------------------------------------------------------------------------

-- Every public table with RLS on must be decided: open to Visitors by name, or
-- carrying a restrictive policy that mentions is_visitor.
create or replace function public.tables_undecided_for_visitors()
returns setof text
language sql
stable
set search_path = ''
as $$
  select c.relname::text
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity
    and c.relname <> all (public.visitor_open_tables())
    and not exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = c.relname
        and p.permissive = 'RESTRICTIVE'
        and (coalesce(p.qual, '') || coalesce(p.with_check, '')) like '%is_visitor%'
    )
  order by 1
$$;

revoke all on function public.tables_undecided_for_visitors() from public, anon, authenticated;
grant execute on function public.tables_undecided_for_visitors() to service_role;

do $$
declare
  v_open text;
begin
  select string_agg(t, ', ') into v_open from public.tables_undecided_for_visitors() t;
  if v_open is not null then
    raise exception 'Tables with no Visitor decision (restrictive is_visitor policy, or visitor_open_tables()): %', v_open;
  end if;
end $$;
