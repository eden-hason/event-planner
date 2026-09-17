-- The claim can be scoped to named Deliveries.
--
-- claim_delivery_batch(p_limit) takes the oldest queued Deliveries across the
-- whole queue, which is right for the Worker and wrong for everyone else. The
-- Operator's manual send called it too, and so could claim Deliveries belonging
-- to other Events that happened to be queued at that moment. It then tried to
-- hand them back by deleting their pending attempts and re-queueing them.
--
-- Un-claiming is exactly what ADR 0014 forbids: the claim is the record that a
-- send was attempted, and deleting it is how a Guest ends up written to twice.
-- Worse, a crash between the delete and the re-queue leaves those Deliveries
-- with neither an attempt nor a next_attempt_at - silently dropped, with
-- nothing anywhere saying so.
--
-- So the claim itself learns to be scoped. p_delivery_ids null keeps the old
-- queue-wide behaviour for the Worker; a non-null array restricts the claim to
-- those Deliveries, and nothing else is ever taken. Nothing has to be given
-- back, because nothing unwanted is claimed.

drop function if exists public.claim_delivery_batch(int);

create or replace function public.claim_delivery_batch(
  p_limit int,
  p_delivery_ids uuid[] default null
)
returns table (delivery_id uuid, attempt_id uuid, send_payload jsonb)
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    select d.id, d.send_payload, d.template_id
    from public.message_deliveries d
    where d.next_attempt_at is not null
      and d.next_attempt_at <= now()
      and d.send_payload is not null
      and (p_delivery_ids is null or d.id = any(p_delivery_ids))
    order by d.next_attempt_at
    for update skip locked
    limit greatest(p_limit, 0)
  ),
  dequeued as (
    update public.message_deliveries d
    set next_attempt_at = null
    from claimed c
    where d.id = c.id
    returning d.id, c.send_payload, c.template_id
  ),
  attempted as (
    insert into public.message_delivery_attempts
      (delivery_id, channel, status, template_id, triggered_by)
    select
      q.id,
      (q.send_payload ->> 'channel')::public.delivery_method,
      'pending',
      q.template_id,
      case when p_delivery_ids is null then 'scheduled' else 'manual' end
    from dequeued q
    returning id, delivery_id
  )
  select a.delivery_id, a.id, q.send_payload
  from attempted a
  join dequeued q on q.id = a.delivery_id;
$$;

comment on function public.claim_delivery_batch(int, uuid[]) is
  'Claims up to p_limit queued Deliveries - the whole queue when p_delivery_ids is null, otherwise only those Deliveries. Dequeues each and inserts a pending Delivery Attempt before anything is sent. The only way a Delivery may be claimed (ADR 0014).';

revoke execute on function public.claim_delivery_batch(int, uuid[]) from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Guard: the scoped form takes only what it was asked for
-- --------------------------------------------------------------------------

do $$
declare
  v_mine    uuid;
  v_other   uuid;
  v_claimed int;
  v_error   text := null;
begin
  select id into v_mine from public.message_deliveries limit 1;
  select id into v_other from public.message_deliveries where id <> v_mine limit 1;
  if v_mine is null or v_other is null then
    return; -- a fresh database with nothing to prove against
  end if;

  -- The proof queues and claims real Deliveries, so it runs inside a nested
  -- block that is always rolled back: a guard must not leave a pending attempt
  -- or a cleared payload behind on production data. PL/pgSQL variables are
  -- memory rather than table state, so the verdict survives the rollback even
  -- though every row change does not.
  begin
    update public.message_deliveries
    set next_attempt_at = now(),
        send_payload = jsonb_build_object(
          'channel', 'whatsapp', 'to', '+972500000000',
          'templateName', 't', 'languageCode', 'he', 'components', '[]'::jsonb)
    where id in (v_mine, v_other);

    select count(*) into v_claimed
    from public.claim_delivery_batch(50, array[v_mine]);

    if v_claimed <> 1 then
      v_error := format(
        'a scoped claim took %s deliveries, expected exactly 1', v_claimed);
    elsif exists (
      select 1 from public.message_deliveries
      where id = v_other and next_attempt_at is null
    ) then
      v_error := 'a scoped claim dequeued a delivery it was not given';
    end if;

    -- Sentinel: unwinds everything the proof just wrote.
    raise exception using errcode = 'ZZ999';
  exception
    when sqlstate 'ZZ999' then null;
  end;

  if v_error is not null then
    raise exception 'scoped_delivery_claim: %', v_error;
  end if;
end $$;
