-- A dispatched Schedule is as final as a sent one.
--
-- prevent_sent_schedule_mutation made a send final by refusing any update to a
-- Schedule whose status is 'sent'. Nothing writes that status any more: sending
-- is per-Delivery now, so a Schedule that has gone out keeps status NULL for
-- ever and the trigger never fires (ADR 0013). The protection quietly stopped
-- existing at the moment the Dispatcher replaced the send engine.
--
-- dispatched_at is the replacement fact. Once it is set, every message has been
-- rendered and queued, so changing the Due Time or the audience afterwards
-- changes nothing about what guests receive - it only makes the row disagree
-- with what was actually sent.
--
-- The Dispatcher itself sets dispatched_at, and this trigger fires on UPDATE
-- of a row that was ALREADY dispatched, so the claim is unaffected: OLD is null
-- at that moment. Expiry is likewise unaffected - a Schedule is only expired
-- before it is claimed.

create or replace function public.prevent_sent_schedule_mutation()
returns trigger
language plpgsql
as $$
begin
  if public.schedule_type_is_message(old.schedule_type_id)
     and (old.status = 'sent' or old.dispatched_at is not null) then
    raise exception
      'Cannot modify a schedule that has already been sent (id: %)', old.id
      using errcode = 'raise_exception';
  end if;
  return new;
end;
$$;

comment on function public.prevent_sent_schedule_mutation() is
  'Makes a send final: refuses any update to a message Schedule that has been dispatched (or, historically, marked sent).';

-- --------------------------------------------------------------------------
-- Guard: a dispatched Schedule really is immutable
-- --------------------------------------------------------------------------

do $$
declare
  v_id uuid;
  v_blocked boolean := false;
begin
  select id into v_id
  from public.schedules
  where dispatched_at is not null
    and public.schedule_type_is_message(schedule_type_id)
  limit 1;

  -- Nothing dispatched yet (a fresh database), so there is nothing to prove
  -- against. The function body above is still replaced either way.
  if v_id is null then
    return;
  end if;

  begin
    update public.schedules set target_status = target_status where id = v_id;
  exception when raise_exception then
    v_blocked := true;
  end;

  if not v_blocked then
    raise exception
      'dispatched_schedules_are_final: schedule % was dispatched but is still mutable', v_id;
  end if;
end $$;
