-- Stop tracking whether a guest opened the confirmation page.
--
-- Two records carried it: a 'view' row in guest_interactions, written when the
-- page rendered, and message_deliveries.clicked_at, stamped when a delivery's
-- link was first opened. Confirmation is answered inside WhatsApp now, so a
-- Confirmation's page views say nothing, and the SMS guests who still follow a
-- link are too few to be worth a metric. Nothing reads clicked_at at all.
--
-- 'click' goes with 'view': it names the same idea, nothing has ever written
-- it, and the type is being rebuilt anyway. Postgres cannot drop a value from
-- an enum, so the type is recreated without them and the column recast.

drop index if exists public.idx_guest_interactions_unique_view;

delete from public.guest_interactions
where interaction_type in ('view', 'click');

alter type public.interaction_type rename to interaction_type_old;

create type public.interaction_type as enum (
  'rsvp_confirm',
  'rsvp_decline',
  'update_guests',
  'share'
);

alter table public.guest_interactions
  alter column interaction_type type public.interaction_type
  using interaction_type::text::public.interaction_type;

drop type public.interaction_type_old;

alter table public.message_deliveries drop column clicked_at;

do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'interaction_type'
      and e.enumlabel in ('view', 'click')
  ) then
    raise exception 'interaction_type still carries view or click';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'message_deliveries'
      and column_name = 'clicked_at'
  ) then
    raise exception 'message_deliveries.clicked_at was not dropped';
  end if;
end $$;
