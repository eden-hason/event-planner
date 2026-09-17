-- Dispatch state: when a Schedule was handed to the queue, and every time the
-- Dispatcher looked at it.
--
-- Three Schedules have sat at status = null for 23 days with no record of why.
-- The old engine either sent a Schedule or left it exactly as it found it, so a
-- Schedule that failed to send and one the cron never reached are the same row.
-- An Operator cannot tell them apart, and neither can the Back Office.
--
-- dispatched_at is the claim: set once, by the Dispatcher, before any Delivery
-- is queued. schedule_dispatch_attempts is the log: one row every time the
-- Dispatcher considered a Schedule, including the times it decided to do
-- nothing. A Schedule held outside the Send Window says so, with a reason.
--
-- 'expired' joins the completion statuses for a Schedule whose moment has
-- passed - the Event already happened, or the Due Time is more than
-- SCHEDULE_MAX_LATENESS_HOURS old. It is not 'cancelled': nobody cancelled it.
--
-- See docs/adr/0013 and docs/adr/0015.

alter type public.schedule_completion_status add value if not exists 'expired';

alter table public.schedules
  add column dispatched_at timestamptz null;

comment on column public.schedules.dispatched_at is
  'When the Dispatcher claimed this Schedule and queued its Deliveries. Set once, never cleared; a Schedule with a value is never dispatched again.';

-- The Dispatcher's sweep: undispatched, unfinished, due, oldest first.
create index schedules_undispatched_idx
  on public.schedules (scheduled_date)
  where dispatched_at is null and status is null;

-- --------------------------------------------------------------------------
-- The log
-- --------------------------------------------------------------------------

create table public.schedule_dispatch_attempts (
  id                uuid        primary key default gen_random_uuid(),
  schedule_id       uuid        not null references public.schedules (id) on delete cascade,
  attempted_at      timestamptz not null default now(),
  outcome           text        not null,
  -- Why, in one Operator-readable line. Null only for a plain success.
  reason            text        null,
  deliveries_queued integer     not null default 0,
  constraint schedule_dispatch_attempts_outcome_check
    check (outcome in ('dispatched', 'held', 'expired', 'failed'))
);

comment on table public.schedule_dispatch_attempts is
  'One row every time the Dispatcher considered a Schedule, including the times it held or expired it. The record of why a Schedule has not sent.';

-- "What happened to this Schedule", newest first.
create index schedule_dispatch_attempts_schedule_idx
  on public.schedule_dispatch_attempts (schedule_id, attempted_at desc);

-- The Heartbeat: has the Dispatcher run at all, recently?
create index schedule_dispatch_attempts_attempted_at_idx
  on public.schedule_dispatch_attempts (attempted_at desc);

-- Service role only, matching webhook_events. No policies: the Dispatcher runs
-- as the service role, and the Back Office reads through it.
alter table public.schedule_dispatch_attempts enable row level security;

-- --------------------------------------------------------------------------
-- Guard: the column, the table and the enum value all landed
-- --------------------------------------------------------------------------
-- The enum value is checked through the catalog rather than by casting a
-- literal, which Postgres refuses inside the transaction that added it.

do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'schedule_completion_status' and e.enumlabel = 'expired'
  ) then
    raise exception 'schedule_dispatch_state: schedule_completion_status is missing ''expired''';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedules'
      and column_name = 'dispatched_at'
  ) then
    raise exception 'schedule_dispatch_state: schedules.dispatched_at was not added';
  end if;

  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'schedule_dispatch_attempts'
  ) then
    raise exception 'schedule_dispatch_state: schedule_dispatch_attempts was not created';
  end if;
end $$;
