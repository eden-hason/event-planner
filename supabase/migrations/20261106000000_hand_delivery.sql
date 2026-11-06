-- A Hand Delivery (CONTEXT.md, ADR 0052): an Operator sends a Schedule's
-- message to a Guest on WhatsApp from a Kululu team phone, then records that it
-- reached them.
--
-- Of the 163 Failed Deliveries in production on 2026-11-06, 142 had already had
-- an SMS that failed too, and an Event under an SMS Fallback Opt-out gets no SMS
-- at all. Operators were already reaching some of those Guests by hand, with
-- nothing to record it, so the Owner kept seeing them as not reached.
--
-- It is an ordinary Delivery Attempt, not a new Delivery state: triggered_by =
-- 'hand', channel 'whatsapp', status 'delivered'. The roll-up then makes the
-- Delivery Delivered and every reader of the five states stays right as it is.
--
-- Three things change:
--   * 'hand' joins the triggered_by values, with the Operator who recorded it.
--   * At most one Hand Delivery per Delivery, so two Operators pressing at once
--     record it once.
--   * A Hand Delivery recorded by mistake is withdrawn by deleting it - the one
--     attempt that may be erased - so the roll-up now also runs on delete, and
--     the Delivery falls back to what its other attempts reached.
--
-- Only the Back Office records one, through the service role. The Owner's own
-- insert policy (an Owner-triggered send runs under their session) is closed to
-- it, because a Hand Delivery is Kululu's word, not the Owner's.

-- --------------------------------------------------------------------------
-- 'hand', and who recorded it
-- --------------------------------------------------------------------------

alter table public.message_delivery_attempts
  drop constraint message_delivery_attempts_triggered_by_check;

alter table public.message_delivery_attempts
  add constraint message_delivery_attempts_triggered_by_check
    check (triggered_by in ('scheduled', 'manual', 'fallback', 'fallback_auto', 'hand'));

alter table public.message_delivery_attempts
  add column recorded_by uuid null references auth.users (id) on delete set null;

comment on column public.message_delivery_attempts.recorded_by is
  'The Operator who recorded a Hand Delivery (triggered_by = ''hand''). Null for every other attempt.';

-- A Hand Delivery is the Operator saying it arrived: WhatsApp, delivered, and
-- with a delivery time. Nothing else may carry the trigger.
alter table public.message_delivery_attempts
  add constraint message_delivery_attempts_hand_check
    check (
      triggered_by <> 'hand'
      or (channel = 'whatsapp' and status = 'delivered' and delivered_at is not null)
    );

create unique index message_delivery_attempts_one_hand_key
  on public.message_delivery_attempts (delivery_id)
  where triggered_by = 'hand';

create index message_delivery_attempts_recorded_by_idx
  on public.message_delivery_attempts (recorded_by)
  where recorded_by is not null;

comment on column public.message_delivery_attempts.triggered_by is
  'Who started the attempt: scheduled (the Dispatcher), manual (an Operator or Owner resend on Kululu''s WhatsApp), fallback / fallback_auto (an SMS Fallback by an Operator / the sweeper), hand (a Hand Delivery an Operator recorded).';

-- --------------------------------------------------------------------------
-- Owners cannot write one
-- --------------------------------------------------------------------------

create policy "Only Kululu records a Hand Delivery"
  on public.message_delivery_attempts
  as restrictive
  for insert to authenticated
  with check (triggered_by <> 'hand');

create policy "Only Kululu turns an attempt into a Hand Delivery"
  on public.message_delivery_attempts
  as restrictive
  for update to authenticated
  using (true)
  with check (triggered_by <> 'hand');

-- --------------------------------------------------------------------------
-- The roll-up, now on delete too
-- --------------------------------------------------------------------------
-- Unchanged but for the delivery it works on: the deleted row's on delete. With
-- no attempt left the Delivery is left as it was - a Hand Delivery only ever
-- sits on a Delivery that already had a failed attempt, so that does not arise.

create or replace function public.roll_up_message_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delivery_id uuid;
  v_best public.message_delivery_attempts;
begin
  v_delivery_id := case when tg_op = 'DELETE' then old.delivery_id else new.delivery_id end;

  -- Serialise roll-ups of the same delivery. Two webhook notifications for two
  -- attempts of one guest can land together; without the lock each could pick
  -- its "best" from a snapshot missing the other's write.
  perform 1 from public.message_deliveries where id = v_delivery_id for update;

  select a.* into v_best
  from public.message_delivery_attempts a
  where a.delivery_id = v_delivery_id
  order by
    case a.status
      when 'read' then 4
      when 'delivered' then 3
      when 'sent' then 2
      when 'failed' then 1
      else 0
    end desc,
    a.created_at desc
  limit 1;

  if v_best.id is null then
    return null;
  end if;

  update public.message_deliveries d
  set status              = v_best.status,
      delivery_method     = v_best.channel::text,
      template_id         = coalesce(v_best.template_id, d.template_id),
      external_message_id = v_best.external_message_id,
      sent_at             = v_best.sent_at,
      delivered_at        = v_best.delivered_at,
      read_at             = v_best.read_at,
      error_code          = case when v_best.status = 'failed' then v_best.error_code end,
      error_message       = case when v_best.status = 'failed' then v_best.error_message end
  where d.id = v_delivery_id;

  return null;
end;
$$;

revoke execute on function public.roll_up_message_delivery() from public, anon, authenticated;

comment on function public.roll_up_message_delivery() is
  'Keeps message_deliveries in step with its best attempt: read > delivered > sent > failed, latest wins a tie. Runs on delete too, for a withdrawn Hand Delivery.';

drop trigger roll_up_message_delivery on public.message_delivery_attempts;

create trigger roll_up_message_delivery
  after insert or update or delete on public.message_delivery_attempts
  for each row execute function public.roll_up_message_delivery();

-- --------------------------------------------------------------------------
-- Guard: the trigger fires on delete, and the hand index is unique
-- --------------------------------------------------------------------------

do $$
declare
  v_on_delete boolean;
  v_index text;
begin
  select (t.tgtype & 8) <> 0 into v_on_delete
  from pg_trigger t
  where t.tgrelid = 'public.message_delivery_attempts'::regclass
    and t.tgname = 'roll_up_message_delivery';

  select indexdef into v_index
  from pg_indexes
  where schemaname = 'public'
    and indexname = 'message_delivery_attempts_one_hand_key';

  if v_on_delete is not true then
    raise exception 'hand_delivery: roll_up_message_delivery does not fire on delete';
  end if;
  if v_index is null or v_index not ilike 'create unique index%' then
    raise exception 'hand_delivery: one-hand index is not as intended: %', v_index;
  end if;
end $$;
