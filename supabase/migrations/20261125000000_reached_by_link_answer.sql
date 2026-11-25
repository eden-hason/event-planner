-- Reached by Reply, by the link (ADR 0058, amending ADR 0057): a Guest who
-- answers on a Delivery's own RSVP link has one of that Delivery's messages.
--
-- On 2026-11-25 a Schedule's WhatsApp message to a Guest failed (131026), the
-- SMS Fallback went out, and ActiveTrail never reported on it. Five and a half
-- hours later the Guest declined through the SMS's link. The Delivery stayed
-- Sent, so the Owner saw "on the way" next to the Guest's answer. SMS has no
-- reply we can read, so for an SMS the link is the only proof there will ever
-- be.
--
-- The link carries message_deliveries.confirmation_token, which goes out only
-- in that Delivery's messages. The app now sets replied_at when an answer comes
-- through it (recordLinkAnswerProof), on the latest attempt sent before the
-- answer. The roll-up already reads any attempt with replied_at as Delivered
-- (20261123000000_reached_by_reply.sql), so nothing about it changes here.
--
-- The backfill takes past page answers recorded against a Schedule. Only the
-- confirmation-token link records one against a Schedule - the Guest's own
-- invitation link records none - so each names its Delivery by (schedule,
-- guest). An answer that continues an earlier one moves its interaction's
-- created_at forward, so the earliest one left is the answer time, which can
-- only be later than the real one: an attempt credited here was always sent
-- before the Guest answered.

comment on column public.message_delivery_attempts.replied_at is
  'When the Guest first replied to this message: a WhatsApp quick-reply tap or a reply quoting it (ADR 0057), or an answer on the Delivery''s own RSVP link, credited to the latest attempt sent before it (ADR 0058). Proof the message reached them, whatever status its provider reported; the roll-up reads it as Delivered.';

-- --------------------------------------------------------------------------
-- Backfill: answers already given on a Delivery's link
-- --------------------------------------------------------------------------
-- A Delivery that already has a reply keeps it: the first proof stands. The
-- update fires the roll-up, which moves the Delivery.

-- Per Delivery: the earliest answer with a message sent before it, and the
-- latest message sent before that answer - the rule the app applies live.
update public.message_delivery_attempts a
set replied_at = t.answered_at
from (
  select distinct on (d.id)
    att.id as attempt_id,
    gi.created_at as answered_at
  from public.guest_interactions gi
  join public.message_deliveries d
    on d.schedule_id = gi.schedule_id
   and d.guest_id = gi.guest_id
  join public.message_delivery_attempts att
    on att.delivery_id = d.id
   and att.sent_at is not null
   and att.sent_at <= gi.created_at
  where gi.interaction_type in ('rsvp_confirm', 'rsvp_decline')
    and gi.metadata->>'channel' = 'page'
    and gi.schedule_id is not null
    and not exists (
      select 1 from public.message_delivery_attempts r
      where r.delivery_id = d.id and r.replied_at is not null
    )
  order by d.id, gi.created_at asc, att.sent_at desc
) t
where a.id = t.attempt_id
  and a.replied_at is null;

-- --------------------------------------------------------------------------
-- Guard: no Delivery answered on its own link is short of Delivered
-- --------------------------------------------------------------------------

do $$
declare
  v_short int;
begin
  select count(distinct d.id) into v_short
  from public.guest_interactions gi
  join public.message_deliveries d
    on d.schedule_id = gi.schedule_id
   and d.guest_id = gi.guest_id
  where gi.interaction_type in ('rsvp_confirm', 'rsvp_decline')
    and gi.metadata->>'channel' = 'page'
    and d.status in ('pending', 'sent', 'failed')
    and exists (
      select 1 from public.message_delivery_attempts a
      where a.delivery_id = d.id and a.sent_at is not null and a.sent_at <= gi.created_at
    );

  if v_short > 0 then
    raise exception 'reached_by_link_answer: % Deliveries answered on their link are not Delivered', v_short;
  end if;
end $$;
