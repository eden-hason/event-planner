-- Reached by Reply (CONTEXT.md, ADR 0057): a Guest who replies to a WhatsApp
-- message - taps its quick reply, or quotes it - has that message on their
-- phone, whatever WhatsApp reported about it.
--
-- On 2026-11-23 WhatsApp reported a Schedule's message to a Guest as failed
-- (131026, "Message Undeliverable"); three minutes later the Guest tapped the
-- message's own RSVP button and confirmed. The Delivery stayed Failed, so the
-- Owner saw "delivery failed" next to a confirmation, and the SMS Fallback
-- would have sent the Guest an SMS they did not need.
--
-- WhatsApp's report is a provider fact and is kept exactly as it came: the
-- attempt keeps its status, error code and message, and the Back Office still
-- shows them. The reply is a second fact beside it, `replied_at`, and the
-- roll-up reads an attempt with a reply as Delivered. Every reader of the
-- Delivery's five states - the results, the SMS Fallback, the counts - then
-- stays right as it is, the way a Hand Delivery (ADR 0052) works.
--
-- The backfill takes only template button taps, which always answer the
-- template itself. A typed text is attributed to a Guest's latest Delivery by
-- their number, which proves nothing about that message, so it is left out.

alter table public.message_delivery_attempts
  add column replied_at timestamptz null;

comment on column public.message_delivery_attempts.replied_at is
  'When the Guest first replied to this WhatsApp message (a quick-reply tap, or a reply quoting it). Proof the message reached them, whatever status WhatsApp reported; the roll-up reads it as Delivered (ADR 0057).';

-- --------------------------------------------------------------------------
-- The roll-up: a replied attempt counts as Delivered
-- --------------------------------------------------------------------------
-- As before (20261106000000_hand_delivery.sql), but each attempt is ranked by
-- its effective status: one with a reply is at least Delivered, and its
-- delivery time is the reply when WhatsApp never sent a receipt. Read stays
-- above it - a read receipt is the stronger fact and keeps its own time.

create or replace function public.roll_up_message_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delivery_id uuid;
  v_best record;
begin
  v_delivery_id := case when tg_op = 'DELETE' then old.delivery_id else new.delivery_id end;

  -- Serialise roll-ups of the same delivery. Two webhook notifications for two
  -- attempts of one guest can land together; without the lock each could pick
  -- its "best" from a snapshot missing the other's write.
  perform 1 from public.message_deliveries where id = v_delivery_id for update;

  select x.* into v_best
  from (
    select
      a.*,
      case
        when a.replied_at is not null and a.status in ('pending', 'sent', 'failed')
          then 'delivered'::public.delivery_status
        else a.status
      end as effective_status
    from public.message_delivery_attempts a
    where a.delivery_id = v_delivery_id
  ) x
  order by
    case x.effective_status
      when 'read' then 4
      when 'delivered' then 3
      when 'sent' then 2
      when 'failed' then 1
      else 0
    end desc,
    x.created_at desc
  limit 1;

  if v_best.id is null then
    return null;
  end if;

  update public.message_deliveries d
  set status              = v_best.effective_status,
      delivery_method     = v_best.channel::text,
      template_id         = coalesce(v_best.template_id, d.template_id),
      external_message_id = v_best.external_message_id,
      sent_at             = v_best.sent_at,
      delivered_at        = coalesce(v_best.delivered_at, v_best.replied_at),
      read_at             = v_best.read_at,
      error_code          = case when v_best.effective_status = 'failed' then v_best.error_code end,
      error_message       = case when v_best.effective_status = 'failed' then v_best.error_message end
  where d.id = v_delivery_id;

  return null;
end;
$$;

revoke execute on function public.roll_up_message_delivery() from public, anon, authenticated;

comment on function public.roll_up_message_delivery() is
  'Keeps message_deliveries in step with its best attempt: read > delivered > sent > failed, latest wins a tie. An attempt the Guest replied to counts as delivered (ADR 0057). Runs on delete too, for a withdrawn Hand Delivery.';

-- --------------------------------------------------------------------------
-- Backfill: template button taps already received
-- --------------------------------------------------------------------------
-- Each tap goes on the latest WhatsApp attempt of its Delivery made before the
-- tap arrived; the earliest tap is the reply time. The update fires the
-- roll-up, which moves the Delivery.

update public.message_delivery_attempts a
set replied_at = t.first_reply_at
from (
  select distinct on (i.delivery_id)
    i.delivery_id,
    att.id as attempt_id,
    min(i.received_at) over (partition by i.delivery_id) as first_reply_at
  from public.whatsapp_inbound_messages i
  join public.message_delivery_attempts att
    on att.delivery_id = i.delivery_id
   and att.channel = 'whatsapp'
   and att.created_at <= i.received_at
  where i.message_type = 'button'
    and i.delivery_id is not null
  order by i.delivery_id, att.created_at desc
) t
where a.id = t.attempt_id
  and a.replied_at is null;

-- --------------------------------------------------------------------------
-- Guard: no Delivery a Guest tapped a button on is still Failed
-- --------------------------------------------------------------------------

do $$
declare
  v_column text;
  v_still_failed int;
begin
  select data_type into v_column
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'message_delivery_attempts'
    and column_name = 'replied_at';

  select count(distinct d.id) into v_still_failed
  from public.message_deliveries d
  join public.whatsapp_inbound_messages i on i.delivery_id = d.id
  where i.message_type = 'button'
    and d.status = 'failed'
    and exists (
      select 1 from public.message_delivery_attempts a
      where a.delivery_id = d.id and a.channel = 'whatsapp' and a.created_at <= i.received_at
    );

  if v_column is distinct from 'timestamp with time zone' then
    raise exception 'reached_by_reply: replied_at is missing or mistyped: %', v_column;
  end if;
  if v_still_failed > 0 then
    raise exception 'reached_by_reply: % Deliveries with a button reply are still Failed', v_still_failed;
  end if;
end $$;
