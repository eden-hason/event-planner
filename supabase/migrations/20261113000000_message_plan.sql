-- The Message Plan, phase 1: the database (docs/message-plan-build-plan.md).
--
-- An Event is on exactly one Message Plan (ADR 0053, CONTEXT.md "Message Plan"):
-- the Classic one it has always been seeded with, or the current one - an
-- Invitation that asks, two Follow-ups, one Event Reminder and a Thank You. Its
-- messages are written in code (ADR 0055), so a Schedule on the current plan has
-- no template_id and keeps its own choices: the wording (Kululu's or the Owner's
-- Personal Message, ADR 0054), the Owner's text, the attachment of an Ask and
-- the gift switch of the Reminder and the Thank You.
--
-- Rolled out dark. Every existing Event is Classic and so is every new one,
-- until an Operator flips the one setting that says what new Events start on.
-- Before that an Operator pilots the plan by moving chosen Events, one way and
-- only while nothing of theirs has been sent; the move deletes the unsent
-- message Schedules and seeds the current plan from scratch.
--
-- What this migration holds:
--   1. events.message_plan and the "new Events start on" setting
--   2. the two new Schedule Types, invitation and follow_up
--   3. the per-Schedule choices of the current plan
--   4. the date rules Kululu proposes (Reminder) and pins (Thank You)
--   5. the seed, branched on the Event's Message Plan
--   6. one plan's types never on the other's Event
--   7. admin_move_event_to_message_plan, the Operator's move
--   8. guard
--
-- Nothing else in the database reads a Schedule Type key or needs a
-- template_id: the queue, claim and roll-up RPCs carry a null template_id
-- through, and RLS keys on execution_kind. The Classic-only Back Office RPC
-- admin_convert_invitation_to_confirmation finds no Initial Invitation on a
-- current Event, and section 6 refuses the Confirmation it would write anyway.

-- --------------------------------------------------------------------------
-- 1. Which Message Plan an Event is on, and which one new Events start on
-- --------------------------------------------------------------------------

create type public.message_plan as enum ('classic', 'current');

-- No settings table exists, so this is one: a single row, typed per setting.
-- Only the service role reads or writes it (the Back Office, phase 5); the
-- default function below is security definer, so an Owner creating an Event
-- needs no read access.
create table public.app_settings (
  id                     boolean primary key default true check (id),
  new_event_message_plan public.message_plan not null default 'classic',
  updated_at             timestamptz not null default now()
);

comment on table public.app_settings is
  'Kululu-wide settings, one row. Service role only.';
comment on column public.app_settings.new_event_message_plan is
  'The Message Plan a newly created Event starts on. Classic until the Message Plan is switched on (ADR 0053).';

insert into public.app_settings (id) values (true);

alter table public.app_settings enable row level security;
revoke all on table public.app_settings from anon, authenticated;

-- No permissive policy: nobody but the service role (which bypasses RLS) gets a
-- row. The Visitor decision (ADR 0028) is the same closed door, said explicitly.
create policy "Visitors cannot use app_settings"
  on public.app_settings
  as restrictive
  for all
  to authenticated
  using ((select public.is_visitor()) is false)
  with check ((select public.is_visitor()) is false);

create trigger update_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.update_updated_at_column();

create or replace function public.new_event_message_plan()
returns public.message_plan
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.new_event_message_plan from public.app_settings s where s.id),
    'classic'::public.message_plan);
$$;

comment on function public.new_event_message_plan() is
  'The Message Plan a new Event starts on: app_settings.new_event_message_plan, Classic if the row is missing.';

-- A column default rather than a trigger alone: it applies to every writer (the
-- app, the service role, seeds) and reads as what it is in the table's
-- definition. A default is only used when the insert leaves the column out,
-- though, and an Owner's client could name it - which is what the trigger
-- below is for. Either way the Event keeps the plan it was created on; only
-- the move changes it.
alter table public.events
  add column message_plan public.message_plan not null default public.new_event_message_plan();

comment on column public.events.message_plan is
  'Which Message Plan the Event is on (ADR 0053). Taken from app_settings when the Event is created and kept; only admin_move_event_to_message_plan changes it, Classic to current.';

-- Every existing row got the default above, which is Classic because the
-- setting row was just created Classic.

-- An Owner (or Visitor) never picks the plan. On insert their value is replaced
-- with the setting's - a duplicated Event is a new Event, so it starts on what
-- new Events start on. On update the change is refused outright. The service
-- role and direct database sessions (auth.role() is not 'authenticated' or
-- 'anon') may set it, but still only Classic to current, and only on an Event
-- with no message Schedule left, which is what the move leaves behind.
create or replace function public.guard_event_message_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client boolean := coalesce(auth.role(), '') in ('authenticated', 'anon');
begin
  if tg_op = 'INSERT' then
    if v_client then
      new.message_plan := public.new_event_message_plan();
    end if;
    return new;
  end if;

  if new.message_plan is distinct from old.message_plan then
    if v_client then
      raise exception 'An Event''s Message Plan is changed only by an Operator'
        using errcode = 'insufficient_privilege';
    end if;
    if old.message_plan = 'current' then
      raise exception 'Event % is on the current Message Plan and cannot go back to Classic', new.id
        using errcode = 'check_violation';
    end if;
    if exists (
      select 1 from public.schedules s
       where s.event_id = new.id
         and public.schedule_type_is_message(s.schedule_type_id)
    ) then
      raise exception 'Event % still has message Schedules; move it with admin_move_event_to_message_plan', new.id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_event_message_plan
  before insert or update of message_plan on public.events
  for each row execute function public.guard_event_message_plan();

-- --------------------------------------------------------------------------
-- 2. The Schedule Types of the current plan
-- --------------------------------------------------------------------------

-- Shaped like advance_reminder (20261031000000): key, English name, sort_order,
-- execution_kind 'message', so schedule_type_is_message() is true for both. They
-- go between advance_reminder and event_reminder: every existing relative order
-- stays, and on the current plan the order reads Invitation, Follow-up, Event
-- Reminder, Thank You. No Event holds types of both plans (section 6), so how
-- the two families interleave never shows.

update public.schedule_types
set sort_order = sort_order + 2
where sort_order >= 4;

insert into public.schedule_types (key, name, sort_order, execution_kind)
values
  ('invitation', 'Invitation', 4, 'message'),
  ('follow_up',  'Follow-up',  5, 'message');

-- --------------------------------------------------------------------------
-- 3. What a Schedule on the current plan chooses
-- --------------------------------------------------------------------------

-- Text and check constraints, like target_status beside them. All four are null
-- on every Classic row, which is what keeps the existing rows valid. Which
-- Schedule Type may carry which column needs the type's key, which a check
-- constraint cannot read (the type ids differ between databases), so that half
-- is in section 6's trigger; what one row can say on its own is here.

alter table public.schedules
  add column wording text,
  add column personal_text text,
  add column attachment text,
  add column gift_button boolean;

alter table public.schedules
  add constraint schedules_wording_check
    check (wording in ('kululu', 'personal')),
  -- A raw cap against abuse only. The 400-character rule is counted with the
  -- Message Fields filled in, which only app code can do (phase 2).
  add constraint schedules_personal_text_length
    check (char_length(personal_text) <= 4000),
  add constraint schedules_attachment_check
    check (attachment in ('image', 'video', 'none')),
  -- An Ask has an attachment and no gift switch; the Reminder and the Thank You
  -- the other way round. No Schedule has both.
  add constraint schedules_attachment_or_gift_button
    check (attachment is null or gift_button is null);

comment on column public.schedules.wording is
  'Current Message Plan only: kululu (the stage''s Kululu Wording) or personal (the Owner''s Personal Message, ADR 0054). Null on Classic.';
comment on column public.schedules.personal_text is
  'Current Message Plan only: the Owner''s Personal Message, paragraphs and Message Field tokens in one text. Kept as a draft while wording is kululu.';
comment on column public.schedules.attachment is
  'Current Message Plan Asks only: image, video (Invitation only) or none.';
comment on column public.schedules.gift_button is
  'Current Message Plan Event Reminder and Thank You only: the gift switch. The send still needs the Gifting page set up.';

-- --------------------------------------------------------------------------
-- 4. The days Kululu proposes and pins (mirrored in TypeScript)
-- --------------------------------------------------------------------------

-- The same rules as src/features/schedules/utils/message-plan-dates.ts, and
-- checked against the same cases in section 8. The Event's day is a calendar
-- date; the result is that day's 10:00 read as an Israel wall clock, so the
-- instant follows daylight saving.

-- The Event Reminder's proposal: the Event day at 10:00, or the day before
-- when the Event starts before 14:00. Kululu never proposes Saturday, so a
-- Saturday becomes the Friday before it (the design brief: "Kululu proposes
-- Friday instead of Saturday"). That covers the day before a Sunday-morning
-- Event and also the morning of a Saturday-evening one. An unreadable or
-- missing start time counts as evening, the common case.
create or replace function public.message_plan_reminder_proposal(p_event_day date, p_start_time text)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  v_day   date := p_event_day;
  v_clock text[] := regexp_match(coalesce(p_start_time, ''), '^\s*(\d{1,2}):(\d{2})');
begin
  if v_clock is not null and v_clock[1]::int * 60 + v_clock[2]::int < 14 * 60 then
    v_day := v_day - 1;
  end if;
  if extract(isodow from v_day) = 6 then
    v_day := v_day - 1;
  end if;
  return (v_day + time '10:00') at time zone 'Asia/Jerusalem';
end;
$$;

comment on function public.message_plan_reminder_proposal(date, text) is
  'The Event Reminder Due Time Kululu proposes: Event day 10:00, the day before when the Event starts before 14:00, Saturday moved to Friday. Israel wall clock.';

-- The Thank You's pinned day: the day after the Event, or Sunday when that is
-- Saturday. Only the hour moves, so it is a parameter.
create or replace function public.message_plan_thank_you_due(p_event_day date, p_time time default '10:00')
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  v_day date := p_event_day + 1;
begin
  if extract(isodow from v_day) = 6 then
    v_day := v_day + 1;
  end if;
  return (v_day + p_time) at time zone 'Asia/Jerusalem';
end;
$$;

comment on function public.message_plan_thank_you_due(date, time) is
  'The Thank You Due Time: the day after the Event (Sunday when that is Saturday) at the given Israel wall clock hour.';

-- The Event's start for the 14:00 rule: the reception time, which is when the
-- calendar entry starts too (buildCalendarEntry), else the ceremony time.
-- Takes the two texts rather than the row, so PostgREST does not expose it as
-- a computed field on events.
create or replace function public.message_plan_start_time(p_reception_time text, p_ceremony_time text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(nullif(btrim(p_reception_time), ''), nullif(btrim(p_ceremony_time), ''));
$$;

-- --------------------------------------------------------------------------
-- 5. The seed, branched on the Message Plan
-- --------------------------------------------------------------------------

-- The current plan's five message Schedules, plus the call Schedules when asked
-- for. Shared by the seed and the move (which leaves call Schedules alone).
-- Not callable by clients: only the two functions below reach it.
--
-- The defaults:
--   - wording kululu, template_id null (ADR 0055)
--   - Asks start undated (ADR 0029); the Reminder is proposed, the Thank You
--     pinned (section 4)
--   - attachment image when the Event has an invitation image, else none. The
--     image is judged as hasInvitationImage does, approximated as an http(s)
--     URL with no spaces. Never video by default.
--   - gift_button on when the Gifting page is set up, as isGiftingEnabled
--     judges it: PayBox or Bit enabled with a non-blank link (the design
--     brief, 6.4). At seed time it usually is not set up yet; the switch is
--     the Owner's from then on.
create or replace function public.seed_current_message_plan_schedules(
  p_event      public.events,
  p_status     public.schedule_completion_status,
  p_with_calls boolean
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day        date := (p_event.event_date at time zone 'UTC')::date;
  v_attachment text;
  v_gift       boolean;
  v_inserted   integer;
  v_calls      integer := 0;
begin
  v_attachment := case
    when coalesce(btrim(p_event.invitations ->> 'imageUrl'), '') ~* '^https?://\S+$' then 'image'
    else 'none'
  end;

  v_gift := coalesce(
       ((p_event.event_settings -> 'payboxConfig' ->> 'enabled') = 'true'
         and coalesce(btrim(p_event.event_settings -> 'payboxConfig' ->> 'link'), '') <> '')
    or ((p_event.event_settings -> 'bitConfig' ->> 'enabled') = 'true'
         and coalesce(btrim(p_event.event_settings -> 'bitConfig' ->> 'link'), '') <> ''),
    false);

  insert into public.schedules
    (event_id, schedule_type_id, template_id, scheduled_date, target_status, status,
     wording, attachment, gift_button)
  select
    p_event.id, st.id, null, v.due, v.target_status, p_status,
    'kululu', v.attachment, v.gift_button
  from (values
    (1, 'invitation',     null::timestamptz, null::text,  v_attachment, null::boolean),
    (2, 'follow_up',      null,              'pending',   v_attachment, null),
    (3, 'follow_up',      null,              'pending',   v_attachment, null),
    (4, 'event_reminder',
        public.message_plan_reminder_proposal(
          v_day, public.message_plan_start_time(p_event.reception_time, p_event.ceremony_time)),
                                             'confirmed', null,         v_gift),
    (5, 'post_event',     public.message_plan_thank_you_due(v_day),
                                             'confirmed', null,         v_gift)
  ) as v (ord, key, due, target_status, attachment, gift_button)
  join public.schedule_types st on st.key = v.key
  order by v.ord;

  get diagnostics v_inserted = row_count;
  if v_inserted <> 5 then
    raise exception 'seed_current_message_plan_schedules: seeded % message Schedules, expected 5', v_inserted;
  end if;

  -- Call Schedules exactly as the Classic seed writes them.
  if p_with_calls then
    insert into public.schedules
      (event_id, schedule_type_id, template_id, scheduled_date, target_status, status)
    select
      p_event.id,
      d.schedule_type_id,
      d.template_id,
      case
        when d.days_offset is null then null
        else ((((p_event.event_date at time zone 'UTC')::date + d.days_offset)
          + d.default_time) at time zone 'Asia/Jerusalem')
      end,
      d.target_status,
      p_status
    from public.event_type_default_schedules d
    where d.event_type_id = p_event.event_type_id
      and not public.schedule_type_is_message(d.schedule_type_id)
    order by d.sort_order;
    get diagnostics v_calls = row_count;
  end if;

  return v_inserted + v_calls;
end;
$$;

revoke execute on function public.seed_current_message_plan_schedules(public.events, public.schedule_completion_status, boolean)
  from public, anon, authenticated;

-- Unchanged from 20261030000001 for a Classic Event: the same checks, the same
-- status and Plan rule, the same insert. A current Event takes the branch.
create or replace function public.seed_event_default_schedules(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_event      public.events;
  v_can_send   boolean;
  v_calls      boolean;
  v_status     public.schedule_completion_status;
  v_inserted   integer;
begin
  select * into v_event from public.events where id = p_event_id;

  if not found
     or v_event.event_date is null
     or v_event.event_type_id is null then
    return 0;
  end if;

  -- Idempotent by design: this runs from an AFTER trigger that can fire on any
  -- update touching the two columns, and the whole point is that the set is
  -- seeded exactly once.
  if exists (select 1 from public.schedules where event_id = p_event_id) then
    return 0;
  end if;

  -- An Event that can already send when its date lands (paid first, dated
  -- later) is seeded active. Seeding it 'disabled' would leave it inert
  -- forever, because the enable trigger only fires on a billing change that
  -- has already happened.
  v_can_send := v_event.billing_status = 'paid';
  v_status := case when v_can_send then null else 'disabled'::public.schedule_completion_status end;

  -- The same Event, paid first on a Plan without calls, gets no Call Rounds.
  v_calls := public.event_plan_includes_calls(p_event_id);

  -- The current Message Plan's messages are not in the catalog (ADR 0055).
  if v_event.message_plan = 'current' then
    return public.seed_current_message_plan_schedules(v_event, v_status, v_calls);
  end if;

  -- The Due Time is one instant, authored as an Israel wall clock
  -- (docs/adr/0015-a-due-time-is-a-request-not-an-instruction.md). `event_date`
  -- is a calendar date pinned at 00:00 UTC, so the day is shifted in UTC and
  -- only the clock face is read in Israel - mirroring calculateScheduledDate in
  -- src/features/schedules/utils/index.ts. A catalog row with no offset is one
  -- the Owner dates, so it is seeded undated (ADR 0029).
  insert into public.schedules
    (event_id, schedule_type_id, template_id, scheduled_date, target_status, status)
  select
    p_event_id,
    d.schedule_type_id,
    d.template_id,
    case
      when d.days_offset is null then null
      else ((((v_event.event_date at time zone 'UTC')::date + d.days_offset)
        + d.default_time) at time zone 'Asia/Jerusalem')
    end,
    d.target_status,
    v_status
  from public.event_type_default_schedules d
  where d.event_type_id = v_event.event_type_id
    and (v_calls or public.schedule_type_is_message(d.schedule_type_id))
  order by d.sort_order;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- --------------------------------------------------------------------------
-- 6. Each plan's Schedules on its own Events only
-- --------------------------------------------------------------------------

-- On a Classic Event: no invitation or follow_up, and none of section 3's
-- columns. On a current Event: no initial_invitation, confirmation or
-- advance_reminder, no template_id and no Classic Personal Message on a
-- message Schedule, and section 3's columns only on the types they belong to.
-- A current message Schedule written without its choices gets the defaults
-- (Kululu Wording, no attachment, gift switch off), so an Operator creating an
-- Extra Schedule by hand writes a complete row. event_reminder, post_event and
-- phone_call belong to both plans.
create or replace function public.enforce_schedule_message_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.message_plan;
  v_key  text;
begin
  select e.message_plan into v_plan from public.events e where e.id = new.event_id;
  select st.key into v_key from public.schedule_types st where st.id = new.schedule_type_id;

  if v_plan is null then
    return new;  -- the foreign key reports the missing Event
  end if;

  if v_plan = 'classic' then
    if v_key in ('invitation', 'follow_up') then
      raise exception 'Schedule Type % belongs to the current Message Plan; Event % is Classic', v_key, new.event_id
        using errcode = 'check_violation';
    end if;
    if new.wording is not null or new.personal_text is not null
       or new.attachment is not null or new.gift_button is not null then
      raise exception 'wording, personal_text, attachment and gift_button are for the current Message Plan; Event % is Classic', new.event_id
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- current
  if v_key in ('initial_invitation', 'confirmation', 'advance_reminder') then
    raise exception 'Schedule Type % belongs to the Classic Message Plan; Event % is on the current one', v_key, new.event_id
      using errcode = 'check_violation';
  end if;

  if not public.schedule_type_is_message(new.schedule_type_id) then
    if new.wording is not null or new.personal_text is not null
       or new.attachment is not null or new.gift_button is not null then
      raise exception 'A Schedule of type % carries no message choices', v_key
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.template_id is not null or new.personal_message is not null then
    raise exception 'A Schedule on the current Message Plan has no template_id or Classic personal_message (ADR 0055)'
      using errcode = 'check_violation';
  end if;

  new.wording := coalesce(new.wording, 'kululu');

  if v_key in ('invitation', 'follow_up') then
    new.attachment := coalesce(new.attachment, 'none');
    if v_key = 'follow_up' and new.attachment = 'video' then
      raise exception 'A Follow-up attaches the image or nothing, never the video'
        using errcode = 'check_violation';
    end if;
    if new.gift_button is not null then
      raise exception 'An Ask has no gift button' using errcode = 'check_violation';
    end if;
  elsif v_key in ('event_reminder', 'post_event') then
    new.gift_button := coalesce(new.gift_button, false);
    if new.attachment is not null then
      raise exception 'A Schedule of type % has no attachment', v_key using errcode = 'check_violation';
    end if;
  elsif new.attachment is not null or new.gift_button is not null then
    raise exception 'A Schedule of type % has no attachment or gift button', v_key
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger enforce_schedule_message_plan
  before insert or update of event_id, schedule_type_id, template_id, personal_message,
    wording, personal_text, attachment, gift_button
  on public.schedules
  for each row execute function public.enforce_schedule_message_plan();

-- --------------------------------------------------------------------------
-- 7. The Operator moves an Event to the current Message Plan
-- --------------------------------------------------------------------------

-- One way, and only while nothing has gone out: a message Schedule that was
-- sent, expired, claimed for dispatch (dispatched_at, or a 'dispatched'
-- attempt), has a Delivery or has a Guest's answer against it stops the move.
-- Otherwise every message Schedule of the Event is deleted - all of them are
-- unsent by then - the Event is put on the current plan and the five are
-- seeded as for a new Event. Nothing is carried (ADR 0053): not Due Times,
-- Variants, notes or Personal Message text.
--
-- What else points at a deleted Schedule, and what happens to it:
--   - message_deliveries, guest_interactions: none exist (refused above)
--   - schedule_dispatch_attempts: only 'held'/'failed' rows can exist; they
--     cascade away with the Schedule, which never sent
--   - test_messages: the account's Test Messages stay (the 3-per-account cap
--     counts them) and lose their schedule_id (on delete set null)
--   - an Extra Schedule: its Entitlement is the extra_schedule payment in
--     event_billing_events, which never pointed at a Schedule (CONTEXT.md
--     "Extra Schedule") and is untouched. The Schedule itself is deleted and
--     not recreated; the payment stays on record for the Operator to grant the
--     Follow-up again, as the move dialog says.
-- Call Schedules and Call Rounds are not touched.
--
-- Returns the number of Schedules seeded: 5, or 0 for an Event with no date or
-- type yet, which the seed trigger then seeds on the current plan once it has
-- both. Refusals carry a reason in DETAIL: not_found, already_current, sent.
create or replace function public.admin_move_event_to_message_plan(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event  public.events;
  v_status public.schedule_completion_status;
  v_sent   integer;
begin
  select * into v_event from public.events where id = p_event_id for update;

  if not found then
    raise exception 'admin_move_event_to_message_plan: no Event %', p_event_id
      using errcode = 'P0002', detail = 'not_found';
  end if;

  if v_event.message_plan = 'current' then
    raise exception 'admin_move_event_to_message_plan: Event % is already on the current Message Plan', p_event_id
      using errcode = 'P0001', detail = 'already_current';
  end if;

  -- Lock the message Schedules so a dispatch cannot claim one mid-move.
  perform 1 from public.schedules s
   where s.event_id = p_event_id
     and public.schedule_type_is_message(s.schedule_type_id)
   for update;

  select count(*) into v_sent
    from public.schedules s
   where s.event_id = p_event_id
     and public.schedule_type_is_message(s.schedule_type_id)
     and (s.status in ('sent', 'expired')
          or s.sent_at is not null
          or s.dispatched_at is not null
          or exists (select 1 from public.message_deliveries d where d.schedule_id = s.id)
          or exists (select 1 from public.guest_interactions gi where gi.schedule_id = s.id)
          or exists (select 1 from public.schedule_dispatch_attempts a
                      where a.schedule_id = s.id and a.outcome = 'dispatched'));

  if v_sent > 0 then
    raise exception 'admin_move_event_to_message_plan: Event % has % message Schedule(s) already sent or under way', p_event_id, v_sent
      using errcode = 'P0001', detail = 'sent';
  end if;

  delete from public.schedules s
   where s.event_id = p_event_id
     and public.schedule_type_is_message(s.schedule_type_id);

  update public.events set message_plan = 'current' where id = p_event_id
  returning * into v_event;

  if v_event.event_date is null or v_event.event_type_id is null then
    return 0;
  end if;

  v_status := case when v_event.billing_status = 'paid' then null
                   else 'disabled'::public.schedule_completion_status end;

  return public.seed_current_message_plan_schedules(v_event, v_status, false);
end;
$$;

comment on function public.admin_move_event_to_message_plan(uuid) is
  'Back Office: moves a Classic Event with nothing sent to the current Message Plan, reseeding its message Schedules. Returns how many were seeded. Service role only.';

revoke all on function public.admin_move_event_to_message_plan(uuid) from public, anon, authenticated;
grant execute on function public.admin_move_event_to_message_plan(uuid) to service_role;

-- --------------------------------------------------------------------------
-- 8. Guard
-- --------------------------------------------------------------------------

do $$
declare
  v_order text;
  v_bad   integer;
  v_got   timestamptz;
  v_case  record;
begin
  -- Rolled out dark: every Event is Classic, and so is the setting.
  select count(*) into v_bad from public.events where message_plan <> 'classic';
  if v_bad > 0 then
    raise exception 'message_plan: % Event(s) are not Classic', v_bad;
  end if;
  if (select new_event_message_plan from public.app_settings where id) is distinct from 'classic' then
    raise exception 'message_plan: new Events must start on Classic';
  end if;

  -- The types, in order, both messages.
  select string_agg(key, ',' order by sort_order) into v_order
    from public.schedule_types
   where key in ('confirmation', 'advance_reminder', 'invitation', 'follow_up', 'event_reminder', 'post_event');
  if v_order <> 'confirmation,advance_reminder,invitation,follow_up,event_reminder,post_event' then
    raise exception 'message_plan: schedule types are ordered %', v_order;
  end if;
  if (select count(*) from public.schedule_types
       where key in ('invitation', 'follow_up') and execution_kind = 'message') <> 2 then
    raise exception 'message_plan: invitation and follow_up must be message types';
  end if;

  -- No Schedule breaks section 6's rule (all Events are Classic, so this is
  -- the Classic half) and none carries the current plan's columns.
  select count(*) into v_bad
    from public.schedules s
    join public.events e on e.id = s.event_id
    join public.schedule_types st on st.id = s.schedule_type_id
   where (e.message_plan = 'classic' and st.key in ('invitation', 'follow_up'))
      or (e.message_plan = 'current' and st.key in ('initial_invitation', 'confirmation', 'advance_reminder'))
      or s.wording is not null or s.personal_text is not null
      or s.attachment is not null or s.gift_button is not null;
  if v_bad > 0 then
    raise exception 'message_plan: % Schedule(s) are on the wrong Message Plan', v_bad;
  end if;

  -- The date rules give the answers message-plan-dates.test.ts pins.
  for v_case in
    select * from (values
      ('evening Event',            'reminder',  date '2026-12-10', '19:30', timestamptz '2026-12-10 08:00Z'),
      ('Event before 14:00',       'reminder',  date '2026-12-10', '12:00', timestamptz '2026-12-09 08:00Z'),
      ('13:59 is before 14:00',    'reminder',  date '2026-12-10', '13:59', timestamptz '2026-12-09 08:00Z'),
      ('14:00 is not',             'reminder',  date '2026-12-10', '14:00', timestamptz '2026-12-10 08:00Z'),
      ('single-digit hour',        'reminder',  date '2026-12-10', '9:30',  timestamptz '2026-12-09 08:00Z'),
      ('no start time',            'reminder',  date '2026-12-10', null,    timestamptz '2026-12-10 08:00Z'),
      ('unreadable start time',    'reminder',  date '2026-12-10', 'soon',  timestamptz '2026-12-10 08:00Z'),
      ('DST ends, Sunday evening', 'reminder',  date '2026-10-25', '19:00', timestamptz '2026-10-25 08:00Z'),
      ('Sunday morning Event',     'reminder',  date '2026-12-13', '11:00', timestamptz '2026-12-11 08:00Z'),
      ('Saturday evening Event',   'reminder',  date '2026-12-12', '20:00', timestamptz '2026-12-11 08:00Z'),
      ('Saturday morning Event',   'reminder',  date '2026-12-12', '11:00', timestamptz '2026-12-11 08:00Z'),
      ('Friday Event',             'thank_you', date '2026-12-11', null,    timestamptz '2026-12-13 08:00Z'),
      ('Thursday Event',           'thank_you', date '2026-12-10', null,    timestamptz '2026-12-11 08:00Z'),
      ('DST ends, Sunday morning', 'reminder',  date '2026-10-25', '11:00', timestamptz '2026-10-23 07:00Z'),
      ('DST ends, Saturday Event', 'thank_you', date '2026-10-24', null,    timestamptz '2026-10-25 08:00Z'),
      ('DST starts, Thursday',     'thank_you', date '2027-03-25', null,    timestamptz '2027-03-26 07:00Z')
    ) as c (name, rule, event_day, start_time, expected)
  loop
    v_got := case v_case.rule
      when 'reminder' then public.message_plan_reminder_proposal(v_case.event_day, v_case.start_time)
      else public.message_plan_thank_you_due(v_case.event_day)
    end;
    if v_got is distinct from v_case.expected then
      raise exception 'message_plan: % gave %, expected %', v_case.name, v_got, v_case.expected;
    end if;
  end loop;
end;
$$;
