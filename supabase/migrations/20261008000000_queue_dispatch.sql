-- A Schedule's Deliveries are queued in one statement, in the same transaction
-- as the log row that says the dispatch finished.
--
-- The Dispatcher used to queue each rendered Delivery with its own UPDATE from
-- the function - about 180ms apiece between Vercel (iad1) and the database
-- (eu-central-1). On 2026-10-08 a 513-guest Confirmation ran out of its
-- 60-second budget after 311 of them. The function was killed, 202 Guests were
-- left with no payload, no queue time and no attempt, the Schedule was already
-- claimed so nothing ever went back for them, and the dispatch log had no row
-- at all.
--
-- queue_dispatch makes "queue and record" one transaction: a dispatch either
-- finishes - every Delivery queued and one 'dispatched' row logged - or leaves
-- nothing behind. A claimed Schedule with no 'dispatched' row is therefore a
-- dispatch that was interrupted, and the Dispatcher resumes it (ADR 0031).
--
-- It only ever queues a Delivery that has never been attempted and is not
-- already queued. On a first dispatch that is every Delivery; on a resume it is
-- exactly the Guests the interrupted run never reached. A Guest with an attempt
-- is never queued again from here, so at-most-once (ADR 0014) holds across a
-- resume. The per-Schedule advisory lock makes two overlapping Dispatchers
-- resuming the same Schedule finish it once: the second waits, sees the first's
-- 'dispatched' row, and returns null without queueing or logging anything.

create or replace function public.queue_dispatch(
  p_schedule_id uuid,
  p_items jsonb,
  p_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_queued integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('queue_dispatch:' || p_schedule_id::text, 0));

  if exists (
    select 1 from public.schedule_dispatch_attempts
    where schedule_id = p_schedule_id and outcome = 'dispatched'
  ) then
    return null;
  end if;

  update public.message_deliveries d
  set template_id = i.template_id,
      send_payload = i.send_payload,
      next_attempt_at = now()
  from jsonb_to_recordset(p_items) as i (delivery_id uuid, template_id uuid, send_payload jsonb)
  where d.id = i.delivery_id
    and d.schedule_id = p_schedule_id
    and d.next_attempt_at is null
    and not exists (
      select 1 from public.message_delivery_attempts a where a.delivery_id = d.id
    );
  get diagnostics v_queued = row_count;

  insert into public.schedule_dispatch_attempts (schedule_id, outcome, reason, deliveries_queued)
  values (p_schedule_id, 'dispatched', p_reason, v_queued);

  return v_queued;
end;
$$;

comment on function public.queue_dispatch(uuid, jsonb, text) is
  'Queues a Schedule''s rendered Deliveries ([{delivery_id, template_id, send_payload}]) and logs the ''dispatched'' row in one transaction. Skips any Delivery already attempted or queued. Returns the number queued, or null when the Schedule was already dispatched (ADR 0031).';

revoke execute on function public.queue_dispatch(uuid, jsonb, text) from public, anon, authenticated;

comment on column public.schedules.dispatched_at is
  'When the Dispatcher claimed this Schedule. Set once, never cleared. The dispatch finished when a ''dispatched'' row exists in schedule_dispatch_attempts; a claim without one was interrupted and is resumed for the Guests it never reached (ADR 0031).';

-- --------------------------------------------------------------------------
-- Guard: an attempted Delivery is never queued again, a never-attempted one is,
-- and a dispatch finishes once
-- --------------------------------------------------------------------------

do $$
declare
  v_attempted public.message_deliveries%rowtype;
  v_fresh     public.message_deliveries%rowtype;
  v_queued    integer;
  v_again     integer;
  v_error     text := null;
begin
  select d.* into v_attempted
  from public.message_deliveries d
  where exists (select 1 from public.message_delivery_attempts a where a.delivery_id = d.id)
  limit 1;

  select d.* into v_fresh
  from public.message_deliveries d
  where d.next_attempt_at is null
    and not exists (select 1 from public.message_delivery_attempts a where a.delivery_id = d.id)
  limit 1;

  -- The proofs write real rows, so they run inside a nested block that is
  -- always rolled back - see 20260917000006_scoped_delivery_claim.sql. Each
  -- clears its Schedule's 'dispatched' rows first, so the call is a dispatch
  -- that has not finished yet rather than one that is refused outright.
  begin
    if v_attempted.id is not null then
      delete from public.schedule_dispatch_attempts
      where schedule_id = v_attempted.schedule_id and outcome = 'dispatched';

      v_queued := public.queue_dispatch(
        v_attempted.schedule_id,
        jsonb_build_array(jsonb_build_object(
          'delivery_id', v_attempted.id,
          'template_id', v_attempted.template_id,
          'send_payload', '{}'::jsonb)));
      v_again := public.queue_dispatch(v_attempted.schedule_id, '[]'::jsonb);

      if v_queued <> 0 then
        v_error := 'a delivery that was already attempted was queued again';
      elsif v_again is not null then
        v_error := 'a second dispatch of the same schedule was not refused';
      end if;
    end if;

    if v_error is null and v_fresh.id is not null then
      delete from public.schedule_dispatch_attempts
      where schedule_id = v_fresh.schedule_id and outcome = 'dispatched';

      v_queued := public.queue_dispatch(
        v_fresh.schedule_id,
        jsonb_build_array(jsonb_build_object(
          'delivery_id', v_fresh.id,
          'template_id', v_fresh.template_id,
          'send_payload', '{}'::jsonb)));

      if v_queued <> 1 then
        v_error := 'a delivery that was never attempted was not queued';
      end if;
    end if;

    -- Sentinel: unwinds everything the proofs just wrote.
    raise exception using errcode = 'ZZ999';
  exception
    when sqlstate 'ZZ999' then null;
  end;

  if v_error is not null then
    raise exception 'queue_dispatch: %', v_error;
  end if;
end $$;
