-- Special Meals are counted per type within a Guest Record.
--
-- guests.meal_choice held one meal id for the whole record, so a family of five
-- with one vegan could only say "vegan" (all five?) or nothing. The WhatsApp
-- Confirmation Conversation asks "how many vegan?", and the RSVP page and the
-- host's guest form now do the same, so the answer needs a home that can hold
-- it: meal_counts, a map of meal id -> number of Guests, e.g.
-- {"vegan": 1, "gluten_free": 2}. An empty map means no Special Meals.
--
-- Invariants kept in application code rather than here (see
-- src/features/confirmation/utils/meal-counts.ts): the total never exceeds
-- `amount`, and only meal ids the Event switched on are written. A check on the
-- total would turn a host lowering `amount` into a failed save instead of a
-- trimmed meal list.
--
-- The check below guards the shape only: known ids, positive whole numbers.
--
-- Backfill: an old single meal_choice becomes a count of 1. The old answer did
-- not say how many of the record it covered; 1 is the conservative reading
-- (every record has at least one Guest) and matches the common single-guest
-- case exactly. Values that were ever comma-joined are split.
--
-- meal_choice itself is left in place, unread and unwritten, so that pushing
-- this migration before the matching deploy does not break the running app.
-- It is dropped in a follow-up migration once the deploy is live.

alter table public.guests
  add column meal_counts jsonb not null default '{}'::jsonb;

create or replace function public.is_valid_meal_counts(p jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(p) = 'object'
     and not exists (
       select 1
       from jsonb_each(p) as e(k, v)
       where e.k not in ('vegetarian', 'vegan', 'gluten_free', 'strictly_kosher')
          or jsonb_typeof(e.v) <> 'number'
          or (e.v)::numeric <> floor((e.v)::numeric)
          or (e.v)::numeric < 1
     );
$$;

alter table public.guests
  add constraint guests_meal_counts_valid check (public.is_valid_meal_counts(meal_counts));

comment on column public.guests.meal_counts is
  'Special Meals per type within this Guest Record: {meal id: number of Guests}. Empty = none. Replaces meal_choice.';

comment on column public.guests.meal_choice is
  'Deprecated: superseded by meal_counts (20260918000000). Unread and unwritten; dropped in a follow-up migration.';

update public.guests g
set meal_counts = coalesce((
  select jsonb_object_agg(choice, 1)
  from (
    select distinct trim(part) as choice
    from unnest(string_to_array(g.meal_choice, ',')) as part
    where trim(part) in ('vegetarian', 'vegan', 'gluten_free', 'strictly_kosher')
  ) choices
), '{}'::jsonb)
where g.meal_choice is not null and trim(g.meal_choice) <> '';

-- Guard: every guest who had a recognised meal choice now has a non-empty map.
do $$
declare
  v_missing integer;
begin
  select count(*) into v_missing
  from public.guests
  where meal_counts = '{}'::jsonb
    and meal_choice ~ '(^|,)\s*(vegetarian|vegan|gluten_free|strictly_kosher)\s*(,|$)';

  if v_missing > 0 then
    raise exception 'guest_meal_counts: % guest(s) lost their meal choice in the backfill', v_missing;
  end if;
end $$;
