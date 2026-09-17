-- One Worker at a time, and a record that it ran.
--
-- The design called for pg_try_advisory_lock('whatsapp-worker'). A session
-- advisory lock is held by the Postgres *session*, and every call from the
-- application arrives over a pooled PostgREST connection: the lock would be
-- taken on one connection and the release would very likely land on another,
-- leaking a lock that nothing can clear until the pool recycles. A lock that
-- can permanently wedge the entire send pipeline is worse than the concurrency
-- it prevents.
--
-- A lease does the same job across a pool and self-heals. A Worker takes the
-- lease for a short window, extends it while it drains, and clears it when it
-- finishes; a Worker that dies mid-drain simply stops extending, and the lease
-- expires on its own. That expiry is also the backstop the design wanted from
-- connection teardown.
--
-- heartbeat_at is what the Heartbeat endpoint reads. It lives here rather than
-- in its own table because "when did the Worker last do anything" is exactly
-- what extending a lease already records.

create table public.pipeline_locks (
  name         text        primary key,
  locked_at    timestamptz null,
  locked_until timestamptz null,
  -- Last sign of life, kept across releases so an idle pipeline can still prove
  -- it is running. Never cleared.
  heartbeat_at timestamptz null
);

comment on table public.pipeline_locks is
  'Lease-based mutual exclusion for the send pipeline, and the Worker''s heartbeat. One row per named worker.';

-- Two rows: the Worker, which genuinely needs the mutex, and the Dispatcher,
-- which needs only somewhere to say it ran. A cron that finds nothing to do
-- still has to prove it fired, or an idle week is indistinguishable from an
-- outage - which is the single failure the Heartbeat exists to catch.
insert into public.pipeline_locks (name) values ('whatsapp-worker'), ('dispatcher');

-- Service role only: nothing in an authenticated session runs a Worker.
alter table public.pipeline_locks enable row level security;

-- --------------------------------------------------------------------------
-- Acquire, extend, release
-- --------------------------------------------------------------------------

create or replace function public.acquire_pipeline_lock(
  p_name text,
  p_lease_seconds int
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.pipeline_locks
  set locked_at    = now(),
      locked_until = now() + make_interval(secs => greatest(p_lease_seconds, 1)),
      heartbeat_at = now()
  where name = p_name
    and (locked_until is null or locked_until < now())
  returning true;
$$;

comment on function public.acquire_pipeline_lock(text, int) is
  'Takes the named lease if it is free or expired. Returns true when this caller now holds it, and nothing at all when someone else does.';

-- Extending doubles as the heartbeat: a Worker that is still draining is still
-- alive, and there is no second thing to record.
create or replace function public.extend_pipeline_lock(
  p_name text,
  p_lease_seconds int
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.pipeline_locks
  set locked_until = now() + make_interval(secs => greatest(p_lease_seconds, 1)),
      heartbeat_at = now()
  where name = p_name;
$$;

-- heartbeat_at is deliberately left alone: the Worker did run, and the
-- Heartbeat endpoint needs to know that whether or not it is running now.
create or replace function public.release_pipeline_lock(p_name text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.pipeline_locks
  set locked_until = null
  where name = p_name;
$$;

-- Heartbeat without locking: for a cron that has no mutual exclusion to enforce
-- but still needs to record that it ran.
create or replace function public.touch_pipeline_heartbeat(p_name text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.pipeline_locks
  set heartbeat_at = now()
  where name = p_name;
$$;

revoke execute on function public.touch_pipeline_heartbeat(text) from public, anon, authenticated;
revoke execute on function public.acquire_pipeline_lock(text, int) from public, anon, authenticated;
revoke execute on function public.extend_pipeline_lock(text, int) from public, anon, authenticated;
revoke execute on function public.release_pipeline_lock(text) from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Guard: the lease actually excludes a second holder
-- --------------------------------------------------------------------------
-- A migration that creates a mutex and does not prove it is a mutex is worth
-- very little, and this one is cheap to prove.

do $$
declare
  v_first  boolean;
  v_second boolean;
begin
  if (select count(*) from public.pipeline_locks
      where name in ('whatsapp-worker', 'dispatcher')) <> 2 then
    raise exception 'pipeline_locks: the whatsapp-worker and dispatcher rows were not both seeded';
  end if;

  perform public.touch_pipeline_heartbeat('dispatcher');
  if not exists (
    select 1 from public.pipeline_locks where name = 'dispatcher' and heartbeat_at is not null
  ) then
    raise exception 'pipeline_locks: the dispatcher heartbeat was not recorded';
  end if;

  select public.acquire_pipeline_lock('whatsapp-worker', 60) into v_first;
  select public.acquire_pipeline_lock('whatsapp-worker', 60) into v_second;

  if v_first is not true then
    raise exception 'pipeline_locks: a free lease could not be acquired';
  end if;
  if v_second is not null then
    raise exception 'pipeline_locks: a held lease was handed out twice';
  end if;

  perform public.release_pipeline_lock('whatsapp-worker');

  if exists (
    select 1 from public.pipeline_locks
    where name = 'whatsapp-worker' and locked_until is not null
  ) then
    raise exception 'pipeline_locks: the lease was not released';
  end if;
end $$;
