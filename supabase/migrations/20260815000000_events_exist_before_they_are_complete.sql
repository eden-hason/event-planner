-- An event row is now created the moment the couple picks an event type, and
-- each subsequent onboarding answer patches it. See
-- docs/adr/0003-events-exist-before-they-are-complete.md.
--
-- Two columns blocked that: title and event_date were both not null, and
-- neither is known at the first screen. The date is not known until the third,
-- and some couples never have one at all - "we don't have a date yet" is a
-- legitimate, permanent path, not a skipped question. So event_date loses
-- not null outright, and title gains a default so a row can exist before the
-- names are known.
--
-- events.status carries the lifecycle from here on: 'draft' means onboarding is
-- unfinished (no workspace, not in the switcher), 'published' means it is real.
-- Until now status was written by every insert path and read by none.

alter table public.events
  alter column event_date drop not null;

comment on column public.events.event_date is
  'Null while onboarding has not reached the date question, and permanently null for events whose owner answered "no date yet". Everything derived from it - countdowns, schedule offsets - is undefined for those events rather than zero.';

alter table public.events
  alter column title set default '';

comment on column public.events.status is
  'draft = onboarding unfinished; the event is not a workspace and does not appear in the event switcher. published = onboarding completed. archived is declared by the app enum but not yet used.';

-- --------------------------------------------------------------------------
-- Backfill: every event that exists today is a finished one
-- --------------------------------------------------------------------------

-- status was vestigial until now - every insert path wrote 'draft' and nothing
-- ever read it or moved it on. So every event in the table says 'draft' while
-- being a complete, in-use workspace. Now that 'draft' means "no workspace",
-- leaving them would hide every existing event from its owner and empty the
-- event switcher. They completed the old flow, so they are published.
update public.events
   set status = 'published'
 where status = 'draft';

-- --------------------------------------------------------------------------
-- onboarding_step: where a Draft Event resumes
-- --------------------------------------------------------------------------

-- A draft resumes at the first unanswered question, and the answered columns
-- alone cannot say which that is: "we don't have a date yet" and "has not
-- reached the date screen" both leave event_date null, and the same is true of
-- location on the venue screen. Skipping is a real answer, so the flow records
-- how far it got rather than inferring it.
alter table public.events
  add column onboarding_step text
  check (onboarding_step is null or onboarding_step in ('type', 'names', 'date', 'venue', 'estimate'));

comment on column public.events.onboarding_step is
  'Furthest onboarding question answered, where skipping counts as answering. Read only while status = draft, to resume the takeover at the next question. Null on events created before this flow existed.';

-- Events that predate this flow were all created by the single terminal insert,
-- so every one of them answered every question.
update public.events
   set onboarding_step = 'estimate'
 where onboarding_step is null;

-- --------------------------------------------------------------------------
-- guests_estimate: bucket label -> integer
-- --------------------------------------------------------------------------

-- The estimate is now a slider, which produces a number. The old text buckets
-- map to their upper bound, matching what ESTIMATE_UPPER in
-- hero-stat-cards.tsx already treated them as ('350_plus' had no upper bound,
-- and 500 was the figure the progress bar used).
alter table public.events
  alter column guests_estimate type integer
  using (
    case guests_estimate
      when 'up_to_100' then 100
      when '100_200'   then 200
      when '200_350'   then 350
      when '350_plus'  then 500
      when ''          then null
      else nullif(regexp_replace(guests_estimate, '\D', '', 'g'), '')::integer
    end
  );

alter table public.events
  add constraint events_guests_estimate_positive
  check (guests_estimate is null or guests_estimate > 0);

comment on column public.events.guests_estimate is
  'Roughly how many guest records the owner expects, from the onboarding slider. A guess, not a limit - nothing enforces it.';

-- --------------------------------------------------------------------------
-- Guard: the conversion must not have silently dropped anyone's estimate
-- --------------------------------------------------------------------------

do $$
declare
  v_type text;
begin
  select data_type into v_type
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'events'
     and column_name = 'guests_estimate';

  if v_type is distinct from 'integer' then
    raise exception 'guests_estimate is %, expected integer', v_type;
  end if;

  -- The status backfill is the destructive half of this migration: get it wrong
  -- and existing owners lose access to their own workspace. Nothing created
  -- before today can legitimately still be a draft.
  if exists (select 1 from public.events where status = 'draft' and created_at < now()) then
    raise exception 'pre-existing events left in draft status; they would vanish from the event switcher';
  end if;

  if exists (select 1 from public.events where onboarding_step is null) then
    raise exception 'events left without an onboarding_step; their drafts could not resume';
  end if;
end $$;
