# Drop the superseded guests.meal_choice column

Status: done - see `supabase/migrations/20260924000000_drop_guests_meal_choice.sql`
Area: guests
Related: `supabase/migrations/20260918000000_guest_meal_counts.sql`, CONTEXT.md (Special Meal)

## The problem

Special Meals moved from `guests.meal_choice` (one value per Guest Record) to
`guests.meal_counts` (a count per type). The old column was backfilled and deliberately
left in place, unread and unwritten, so that pushing the migration before the matching
deploy would not break the running app - the rollout has no sandbox and the two can land
minutes apart.

## What "done" means

Once the deploy that reads `meal_counts` is live in production, a migration drops
`meal_choice`. Before writing it, confirm nothing references the column:
`grep -rn meal_choice src supabase/seeds` should find only old migrations, and
`guest_interactions.metadata` rows written before the change still carry a `mealChoice`
key, which nothing reads.
