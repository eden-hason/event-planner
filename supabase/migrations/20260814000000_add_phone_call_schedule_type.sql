-- Phone call rounds become planned schedules.
--
-- Until now a round was ad hoc: an admin clicked "New round" and the system
-- snapshotted every pending guest. There was no plan, no date and no target.
-- From here a round is planned as a schedules row like any other outreach, and
-- the back office executes that plan. See
-- docs/adr/0004-call-schedules-are-plans-call-rounds-are-executions.md.
--
-- This migration teaches the catalog that not every schedule type is a message
-- send. Without it, processScheduledMessages would pick up a phone_call row and
-- hand it to the WhatsApp/SMS engine.

-- --------------------------------------------------------------------------
-- 1. The catalog learns who executes a schedule type
-- --------------------------------------------------------------------------

alter table public.schedule_types
  add column execution_kind text not null default 'message'
    check (execution_kind in ('message', 'phone_call'));

comment on column public.schedule_types.execution_kind is
  'Which engine executes schedules of this type. message = the cron-driven WhatsApp/SMS send engine. Anything else is executed by a human or another process and must never reach sendSchedule. Consumers filter positively on ''message'', so a new kind is inert until code opts it in.';

insert into public.schedule_types (key, name, sort_order, execution_kind)
values ('phone_call', 'Call Round', 5, 'phone_call');

-- --------------------------------------------------------------------------
-- 2. A phone_call default has no message to send
-- --------------------------------------------------------------------------

alter table public.event_type_default_schedules
  alter column template_id drop not null;

comment on column public.event_type_default_schedules.template_id is
  'Null for schedule types whose execution_kind is not ''message'' - a call round has no template.';

-- Two call rounds per wedding, planned close enough to the event that the
-- headcount they produce is still actionable.
insert into public.event_type_default_schedules
  (event_type_id, schedule_type_id, template_id, days_offset, default_time, target_status, sort_order)
select
  (select id from public.event_types where key = 'wedding'),
  (select id from public.schedule_types where key = 'phone_call'),
  null,
  d.days_offset,
  d.default_time::time,
  'pending',
  d.sort_order
from (values (-7, '10:00', 6), (-3, '10:00', 7))
  as d(days_offset, default_time, sort_order);

-- --------------------------------------------------------------------------
-- 3. One helper, three callers: the freeze trigger and the two RLS policies
-- --------------------------------------------------------------------------

-- coalesce(..., true) so an unknown schedule_type_id is treated as a message:
-- the safe direction is "keep protecting it", never "unlock it".
create or replace function public.schedule_type_is_message(p_schedule_type_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select st.execution_kind = 'message'
       from public.schedule_types st
      where st.id = p_schedule_type_id),
    true);
$$;

alter function public.schedule_type_is_message(uuid) owner to postgres;

comment on function public.schedule_type_is_message(uuid) is
  'True when schedules of this type are executed by the message send engine. Fails safe to true for an unknown type.';

-- --------------------------------------------------------------------------
-- 4. Narrow the sent-schedule freeze to the invariant it actually protects
-- --------------------------------------------------------------------------

-- The invariant is "a message that physically went out cannot be retroactively
-- edited". For a call plan, status='sent' means "handed to the calling team",
-- and undoing a misclicked Start is a legitimate admin action. One round per
-- plan is carried by the unique index on call_rounds.schedule_id (next
-- migration) plus the optimistic status IS NULL claim, not by freezing the row.
create or replace function public.prevent_sent_schedule_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
BEGIN
  IF OLD.status = 'sent'
     AND public.schedule_type_is_message(OLD.schedule_type_id) THEN
    RAISE EXCEPTION
      'Cannot modify a schedule that has already been sent (id: %)', OLD.id
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- 5. The Owner plans the call once, then it belongs to the back office
-- --------------------------------------------------------------------------

-- Narrowing the trigger above leaves a sent call plan mutable, and
-- schedules_update grants UPDATE to the Owner. These restrictive policies AND
-- with every existing permissive policy, so a call plan is read-only to any
-- authenticated user. INSERT is deliberately untouched: the Owner still creates
-- call plans in the setup wizard. Admin actions use the service client and
-- bypass RLS entirely.
create policy "Only message schedules are mutable by users"
  on public.schedules
  as restrictive
  for update
  to authenticated
  using (public.schedule_type_is_message(schedule_type_id))
  with check (public.schedule_type_is_message(schedule_type_id));

create policy "Only message schedules are deletable by users"
  on public.schedules
  as restrictive
  for delete
  to authenticated
  using (public.schedule_type_is_message(schedule_type_id));
