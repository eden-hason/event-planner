-- Drop guests.meal_choice, superseded by guests.meal_counts (20260918000000).
--
-- That migration backfilled meal_counts and left meal_choice in place, unread and
-- unwritten, so the migration could land before the deploy that reads meal_counts.
-- That deploy is live, and nothing in the app, a view, a policy, an index or a
-- function references the column any more.
--
-- guest_interactions.metadata rows written before the switch still carry a
-- `mealChoice` key. They are history, nothing reads them, and they stay.
--
-- Guard first: refuse to drop while any recognised meal choice has no counterpart
-- in meal_counts, since this is the last copy of that answer.

do $$
declare
  v_missing integer;
begin
  select count(*) into v_missing
  from public.guests
  where meal_counts = '{}'::jsonb
    and meal_choice ~ '(^|,)\s*(vegetarian|vegan|gluten_free|strictly_kosher)\s*(,|$)';

  if v_missing > 0 then
    raise exception 'drop_guests_meal_choice: % guest(s) have a meal_choice not carried into meal_counts', v_missing;
  end if;
end $$;

alter table public.guests drop column meal_choice;
