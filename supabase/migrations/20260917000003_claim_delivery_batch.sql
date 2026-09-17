-- A send is claimed before it is made.
--
-- WhatsApp's /messages endpoint has no idempotency key, so a send whose outcome
-- we never learned can never be safely retried - we cannot ask Meta whether it
-- already went out. The old engine sent first and recorded afterwards, and the
-- gap between the two is real: Vercel killing the function at maxDuration, a
-- deploy tearing down the instance mid-send, or the attempt insert simply
-- failing, which the code logged and walked past while twenty-five messages
-- were already gone. On the next run those Deliveries looked untouched.
--
-- This function is the claim, and nothing else may claim a Delivery. In one
-- statement it takes queued Deliveries, clears next_attempt_at so no second
-- Worker can see them, and inserts a pending Delivery Attempt for each - all
-- before a single byte reaches Meta. A crash in the gap leaves an attempt
-- nobody resolved, which the reaper ages to a System-level failure and puts in
-- front of an Operator. At most once, never twice.
--
-- `for update skip locked` is what makes a second concurrent caller step over
-- the rows this one holds instead of blocking behind them.
--
-- Interaction with roll_up_message_delivery: inserting a pending attempt
-- alongside an existing failed one leaves the Delivery at failed (pending ranks
-- 0, failed ranks 1). That is correct - a Delivery being retried has not
-- un-failed - and it is why the roll-up needs no special case here.
--
-- See docs/adr/0014.

create or replace function public.claim_delivery_batch(p_limit int)
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
      'scheduled'
    from dequeued q
    returning id, delivery_id
  )
  select a.delivery_id, a.id, q.send_payload
  from attempted a
  join dequeued q on q.id = a.delivery_id;
$$;

comment on function public.claim_delivery_batch(int) is
  'Claims up to p_limit queued Deliveries: dequeues them and inserts a pending Delivery Attempt for each, before anything is sent. Returns exactly what the Worker needs - the attempt to resolve and the payload to post. The only way a Delivery may be claimed (ADR 0014).';

-- The Worker runs as the service role, which bypasses RLS; no session role has
-- any business claiming a send.
revoke execute on function public.claim_delivery_batch(int) from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'claim_delivery_batch'
      and p.prosecdef
  ) then
    raise exception 'claim_delivery_batch: the function was not created as security definer';
  end if;
end $$;
