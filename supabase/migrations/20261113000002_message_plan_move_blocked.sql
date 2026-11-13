-- The Back Office's move dialog (phase 5 of docs/message-plan-build-plan.md)
-- has to know, before the Operator clicks, whether an Event has sent anything:
-- the button is disabled with the reason once it has (ADR 0053). That answer is
-- the rule admin_move_event_to_message_plan refuses on, so it moves into one
-- function both call, rather than being written again in the app and drifting.
--
-- admin_move_event_to_message_plan keeps its behaviour: the same locks in the
-- same order, the same refusals with the same errcodes and DETAIL codes, the
-- same reseed. Its "anything sent?" count is now the function below, so the
-- `sent` refusal's message no longer says how many Schedules; callers read
-- DETAIL, not the message.

create or replace function public.event_message_schedules_sent(p_event_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  -- A message Schedule that was sent, expired, claimed for dispatch
  -- (dispatched_at, or a 'dispatched' attempt), has a Delivery or has a
  -- Guest's answer against it.
  select exists (
    select 1
      from public.schedules s
     where s.event_id = p_event_id
       and public.schedule_type_is_message(s.schedule_type_id)
       and (s.status in ('sent', 'expired')
            or s.sent_at is not null
            or s.dispatched_at is not null
            or exists (select 1 from public.message_deliveries d where d.schedule_id = s.id)
            or exists (select 1 from public.guest_interactions gi where gi.schedule_id = s.id)
            or exists (select 1 from public.schedule_dispatch_attempts a
                        where a.schedule_id = s.id and a.outcome = 'dispatched'))
  );
$$;

comment on function public.event_message_schedules_sent(uuid) is
  'Whether any message Schedule of the Event has gone out or is under way: what stops admin_move_event_to_message_plan. Service role only.';

revoke all on function public.event_message_schedules_sent(uuid) from public, anon, authenticated;
grant execute on function public.event_message_schedules_sent(uuid) to service_role;

create or replace function public.admin_move_event_to_message_plan(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event  public.events;
  v_status public.schedule_completion_status;
begin
  select * into v_event from public.events where id = p_event_id for update;

  if not found then
    raise exception 'admin_move_event_to_message_plan: no Event %', p_event_id
      using errcode = 'P0002', detail = 'not_found';
  end if;

  if v_event.message_plan = 'current' then
    raise exception 'admin_move_event_to_message_plan: Event % is already on the current Message Plan', p_event_id
      using errcode = 'P0001', detail = 'already_current';
  end if;

  -- Lock the message Schedules so a dispatch cannot claim one mid-move.
  perform 1 from public.schedules s
   where s.event_id = p_event_id
     and public.schedule_type_is_message(s.schedule_type_id)
   for update;

  if public.event_message_schedules_sent(p_event_id) then
    raise exception 'admin_move_event_to_message_plan: Event % has message Schedules already sent or under way', p_event_id
      using errcode = 'P0001', detail = 'sent';
  end if;

  delete from public.schedules s
   where s.event_id = p_event_id
     and public.schedule_type_is_message(s.schedule_type_id);

  update public.events set message_plan = 'current' where id = p_event_id
  returning * into v_event;

  if v_event.event_date is null or v_event.event_type_id is null then
    return 0;
  end if;

  v_status := case when v_event.billing_status = 'paid' then null
                   else 'disabled'::public.schedule_completion_status end;

  return public.seed_current_message_plan_schedules(v_event, v_status, false);
end;
$$;

comment on function public.admin_move_event_to_message_plan(uuid) is
  'Back Office: moves a Classic Event with nothing sent to the current Message Plan, reseeding its message Schedules. Returns how many were seeded. Service role only.';

-- create or replace keeps the grants, but say them again so this file reads
-- whole.
revoke all on function public.admin_move_event_to_message_plan(uuid) from public, anon, authenticated;
grant execute on function public.admin_move_event_to_message_plan(uuid) to service_role;

-- Guard: the move still calls the shared check, and both stay closed to clients.
do $$
declare
  v_src text;
begin
  select p.prosrc into v_src
    from pg_proc p
   where p.oid = 'public.admin_move_event_to_message_plan(uuid)'::regprocedure;
  if v_src not like '%public.event_message_schedules_sent(p_event_id)%' then
    raise exception 'message_plan_move_blocked: the move does not call event_message_schedules_sent';
  end if;

  if has_function_privilege('authenticated', 'public.event_message_schedules_sent(uuid)', 'execute')
     or has_function_privilege('anon', 'public.event_message_schedules_sent(uuid)', 'execute') then
    raise exception 'message_plan_move_blocked: event_message_schedules_sent is open to clients';
  end if;

  -- Every Event is still Classic and has sent nothing on the current plan, so
  -- the check must answer for any Event without error.
  perform public.event_message_schedules_sent(e.id) from public.events e limit 50;
end;
$$;
