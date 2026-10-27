-- A payment without a kind slipped past event_billing_events_payment_complete.
--
-- 20261027000000 said a payment left without a kind fails that check, and it does not: with
-- kind null, `kind in ('plan', 'top_up')` is null rather than false, so the payment branch
-- comes out null, and a check only refuses false. A 400-record payment on e23df661 landed
-- that way on 2026-10-27, and the Back Office, which lists payments by kind, showed none -
-- while the package, counted from record_count, already had the records. With no Plan on
-- record, the form would have let an Operator open a second package on top of it.
--
-- This gives every payment without a kind the one it should have had, by the same order the
-- first backfill used, and rewrites the check so a null kind is false, not unknown.

-- ---------------------------------------------------------------------------
-- 1. Backfill: the oldest payment of each Event is its Plan, the rest are Top-ups
-- ---------------------------------------------------------------------------

update public.event_billing_events b
set kind = case when ranked.n = 1 then 'plan' else 'top_up' end::public.billing_payment_kind
from (
  select id,
         row_number() over (
           partition by event_id order by occurred_at, created_at, id
         ) as n
  from public.event_billing_events
  where record_count is not null
) ranked
where b.id = ranked.id
  and b.kind is null;

-- ---------------------------------------------------------------------------
-- 2. The same check, with every kind test false on a null kind
-- ---------------------------------------------------------------------------

alter table public.event_billing_events drop constraint event_billing_events_payment_complete;

alter table public.event_billing_events
  add constraint event_billing_events_payment_complete check (
    (
      kind is null
      and record_count is null
      and channel is null
      and payment_method is null
      and schedule_count is null
    )
    or (
      kind is not null
      and kind in ('plan', 'top_up')
      and record_count is not null
      and channel is not null
      and schedule_count is null
      and payment_method is not null
      and amount is not null
      and to_status = 'paid'
    )
    or (
      kind is not null
      and kind = 'extra_schedule'
      and schedule_count is not null
      and record_count is null
      and channel is null
      and payment_method is not null
      and amount is not null
      and to_status = 'paid'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Guard: no payment without a kind, and every package opens with one Plan
-- ---------------------------------------------------------------------------

do $$
declare
  v_unkinded  integer;
  v_misplaced integer;
begin
  select count(*) into v_unkinded
  from public.event_billing_events
  where kind is null
    and (record_count is not null or channel is not null
         or payment_method is not null or schedule_count is not null);

  if v_unkinded > 0 then
    raise exception 'billing_payment_kind_required: % payments have no kind', v_unkinded;
  end if;

  select count(*) into v_misplaced
  from (
    select event_id
    from public.event_billing_events
    where record_count is not null
    group by event_id
    having count(*) filter (where kind = 'plan') <> 1
        or min(occurred_at) <> min(occurred_at) filter (where kind = 'plan')
  ) bad;

  if v_misplaced > 0 then
    raise exception 'billing_payment_kind_required: % events do not open with exactly one plan', v_misplaced;
  end if;
end;
$$;
