import { cache } from 'react';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * The team runs its own accounts against production, and their events and guest
 * records land in the same tables as everyone else's. Counting them tells the
 * Operator the business is bigger than it is, and listing them puts rehearsal
 * work in a queue of real work.
 *
 * `profiles.is_test_account` is the mark. It cannot be enforced in the database:
 * the Back Office reads through createServiceClient(), which bypasses RLS by
 * design, so the exclusion has to be applied by every admin query that reads a
 * table users own. This module is the one place that knows how.
 */
export type TestScope = {
  /** profiles.id of every flagged account. Also what events.user_id holds. */
  userIds: string[];
  /** Every event those accounts own, draft and published alike. */
  eventIds: string[];
};

/**
 * Two round-trips, cached per render so a page reading counts, signals and
 * upcoming events pays for them once.
 *
 * The second trip exists because events.user_id points at auth.users with no
 * foreign key to profiles - the flag cannot be joined or embedded, so ownership
 * has to be resolved to a list of event ids up front. Everything the Back Office
 * reads below an event (guests, schedules, call rounds, deliveries) is already
 * scoped by event id, so those ids are all it takes to filter the rest.
 */
export const getTestScope = cache(async function getTestScope(): Promise<TestScope> {
  await assertAdmin();
  const supabase = createServiceClient();

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_test_account', true);

  if (profilesError) throw new Error(profilesError.message);

  const userIds = (profiles ?? []).map((profile) => profile.id);
  if (!userIds.length) return { userIds: [], eventIds: [] };

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id')
    .in('user_id', userIds);

  if (eventsError) throw new Error(eventsError.message);

  return { userIds, eventIds: (events ?? []).map((event) => event.id) };
});

type NotFilterable<Q> = {
  not(column: string, operator: string, value: unknown): Q;
};

/**
 * Adds `column not in (ids)` to a query, or nothing at all when the list is
 * empty - `not in ()` is a Postgres syntax error, so the common case of no
 * flagged accounts has to skip the filter rather than pass an empty list.
 *
 * Ids come from the database as uuids, so they need no quoting.
 */
export function excludeIds<Q extends NotFilterable<Q>>(
  query: Q,
  column: string,
  ids: string[],
): Q {
  if (!ids.length) return query;
  return query.not(column, 'in', `(${ids.join(',')})`);
}
