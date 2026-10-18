-- Deleting an auth user - from the dashboard, the admin API, or forget_visitor -
-- must not be blocked by the rows that user left behind.
--
-- It was, for anyone who had created an Event. Their collaborator row pointed
-- at the user (and at their profile) through no-action keys, and Postgres
-- checks those before the cascade auth.users -> events -> event_collaborators
-- reaches that row, so the delete failed with "Database error deleting user".
-- forget_visitor worked around it by deleting the Event and the collaborator
-- rows itself first; a manual delete in the dashboard had no such workaround.
--
-- A collaborator row means nothing without its user, so it cascades. The rows
-- that record what a user did on an Event - the audit log, call rounds and
-- call logs - belong to the Event and its other Owners, so they keep the row
-- and lose only the actor (set null).

-- ---------------------------------------------------------------------------
-- 1. Collaborator rows go with their user
-- ---------------------------------------------------------------------------

alter table public.event_collaborators
  drop constraint event_collaborators_user_id_fkey,
  add constraint event_collaborators_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;

alter table public.event_collaborators
  drop constraint event_collaborators_user_id_profiles_fk,
  add constraint event_collaborators_user_id_profiles_fk
    foreign key (user_id) references public.profiles (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 2. History stays with the Event, without its actor
-- ---------------------------------------------------------------------------

alter table public.collaboration_audit_log
  alter column actor_id drop not null,
  drop constraint collaboration_audit_log_actor_id_fkey,
  add constraint collaboration_audit_log_actor_id_fkey
    foreign key (actor_id) references auth.users (id) on delete set null;

alter table public.call_rounds
  drop constraint call_rounds_started_by_fkey,
  add constraint call_rounds_started_by_fkey
    foreign key (started_by) references auth.users (id) on delete set null;

alter table public.call_logs
  drop constraint call_logs_called_by_fkey,
  add constraint call_logs_called_by_fkey
    foreign key (called_by) references auth.users (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. forget_visitor no longer needs to clear the way
-- ---------------------------------------------------------------------------

-- Deletes a Visitor; their Event and everything under it cascades. Refuses
-- anyone who is not anonymous, so a stale or forged id can never remove a real
-- account.
create or replace function public.forget_visitor(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = p_user_id and is_anonymous;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Guard: no key in public may still block deleting a user
-- ---------------------------------------------------------------------------

do $$
declare
  v_blocking text;
begin
  select string_agg(c.conname, ', ')
  into v_blocking
  from pg_constraint c
  where c.contype = 'f'
    and c.connamespace = 'public'::regnamespace
    and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
    and c.confdeltype in ('a', 'r');

  if v_blocking is not null then
    raise exception 'foreign keys still block deleting a user: %', v_blocking;
  end if;
end $$;
