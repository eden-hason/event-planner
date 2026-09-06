-- Make the WhatsApp status webhook cheap to serve and let it keep Meta's own
-- timestamps.
--
-- Two problems, both invisible until a real send is running.
--
-- 1. Every status notification looks a delivery up by external_message_id, and
--    nothing indexed that column. A 500-guest send produces up to 1500 status
--    notifications (sent, delivered, read), so a single blast meant 1500
--    sequential scans of the whole table. The index is unique because a wamid
--    identifies exactly one outgoing message: the constraint is the truth, and
--    it also makes the webhook's lookup unambiguous. Partial, because a row
--    whose send never reached Meta has no wamid and several such rows coexist.
--
-- 2. set_delivery_sent_at() overwrote delivered_at/read_at with now() on the
--    status transition, discarding the timestamp the caller had just written.
--    The webhook records when WhatsApp says the message was delivered, which
--    is not when the notification happened to reach us - a retried or delayed
--    notification could be minutes or hours off. The trigger is meant as a
--    backstop for callers that supply no timestamp, so it now only fills a
--    column that is still null.
--
--    The rewrite also drops the OLD.status predicates. They made the backstop
--    silently inert on rows whose status was null (NULL = 'pending' is NULL,
--    never true) and on any transition that skipped a step - a row going
--    straight from pending to read got neither sent_at nor delivered_at. What
--    the timestamps mean depends only on the status the row ends up in.

create unique index message_deliveries_external_message_id_key
  on public.message_deliveries (external_message_id)
  where external_message_id is not null;

create or replace function public.set_delivery_sent_at()
returns trigger
language plpgsql
as $function$
begin
  if new.sent_at is null and new.status in ('sent', 'delivered', 'read') then
    new.sent_at = now();
  end if;

  if new.delivered_at is null and new.status in ('delivered', 'read') then
    new.delivered_at = now();
  end if;

  if new.read_at is null and new.status = 'read' then
    new.read_at = now();
  end if;

  return new;
end;
$function$;

comment on function public.set_delivery_sent_at() is
  'Backstop that fills the delivery timestamps implied by a row''s status. Never overwrites a value the caller supplied - the WhatsApp webhook writes Meta''s own event timestamps.';
