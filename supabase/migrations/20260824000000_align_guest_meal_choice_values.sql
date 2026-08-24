-- Carries `guests.meal_choice` over to the one meal vocabulary the app now
-- writes (src/lib/meal-choices.ts).
--
-- Two surfaces wrote this column with different ids for the same two meals: the
-- guest drawer wrote `glatt` and `gluten-free`, while the event-details card
-- and the guest-facing RSVP page wrote `strictly_kosher` and `gluten_free`. So
-- a guest who picked כשר למהדרין on their RSVP page came back to the host's
-- guest list as the raw, unlabelled string `strictly_kosher`, with no chip
-- selected in the drawer - and clicking the chip to "correct" it silently
-- rewrote their answer to `glatt`.
--
-- Production holds no rows in the old vocabulary today, but the drawer keeps
-- writing it until this ships alongside the code change, and databases restored
-- from older dumps can hold them.

update guests
   set meal_choice = case meal_choice
                       when 'glatt' then 'strictly_kosher'
                       when 'gluten-free' then 'gluten_free'
                       else meal_choice
                     end
 where meal_choice in ('glatt', 'gluten-free');

-- `events.guests_experience.dietary_types` has only ever been written by the
-- event-details card, which always used the shared ids, so there is nothing to
-- carry over there - but a stale id in that list silently drops an option from
-- every guest's RSVP form, so the guard below checks rather than assumes.

do $$
declare
  stale_meal_choices integer;
  stale_dietary_types integer;
begin
  -- Matches an old id anywhere in the column, not just as the whole value, so a
  -- comma-joined leftover from the drawer's earlier multi-select fails loudly
  -- here instead of surviving the update unnoticed.
  select count(*)
    into stale_meal_choices
    from guests
   where meal_choice ~ '(^|,)\s*(glatt|gluten-free)\s*(,|$)';

  select count(*)
    into stale_dietary_types
    from events,
         lateral jsonb_array_elements_text(
           coalesce(guests_experience -> 'dietary_types', '[]'::jsonb)
         ) as dietary_type
   where dietary_type in ('glatt', 'gluten-free');

  if stale_meal_choices > 0 then
    raise exception
      'guests.meal_choice still holds % row(s) in the old vocabulary', stale_meal_choices;
  end if;

  if stale_dietary_types > 0 then
    raise exception
      'events.guests_experience.dietary_types still holds % entry(ies) in the old vocabulary', stale_dietary_types;
  end if;
end $$;
