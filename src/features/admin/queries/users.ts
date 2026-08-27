'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { CollaboratorRole } from '@/features/collaborate/schemas';
import type { UserDetail, UserRow, UserSharedEvent, UsersIndexFilters, UsersIndexPage } from '../types';
import { excludeIds, getTestScope } from './test-accounts';

const PAGE_SIZE = 50;

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('Query returned no data');
  return result.data;
}

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  is_admin: boolean | null;
  is_test_account: boolean | null;
  created_at: string;
};

/**
 * The whole directory, filtered and paged in memory rather than in SQL - the
 * documented snapshot is 13 rows and the brief only asks this to survive a few
 * hundred (section 11), which is well inside what one query and an array
 * filter can hold. `getEventsIndex` takes the same shape for the same reason.
 */
export async function getUsersIndex(filters: UsersIndexFilters): Promise<UsersIndexPage> {
  await assertAdmin();
  const supabase = createServiceClient();
  const test = await getTestScope();

  const [profilesResult, testAccountsCount] = await Promise.all([
    excludeIds(
      supabase
        .from('profiles')
        .select('id, full_name, email, phone_number, is_admin, is_test_account, created_at')
        .order('created_at', { ascending: false }),
      'id',
      test.userIds,
    ),
    // Independent of the toggle: the hidden-accounts footer needs "how many
    // exist" regardless of whether they are showing right now.
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_test_account', true),
  ]);

  const profiles = unwrap(profilesResult) as unknown as ProfileRow[];
  if (testAccountsCount.error) throw new Error(testAccountsCount.error.message);

  const profileIds = profiles.map((profile) => profile.id);
  const ownedByUser = new Map<string, number>();
  const sharedByUser = new Map<string, number>();

  if (profileIds.length) {
    const [eventsResult, collaboratorsResult] = await Promise.all([
      supabase.from('events').select('user_id').in('user_id', profileIds),
      supabase
        .from('event_collaborators')
        .select('user_id')
        .eq('is_creator', false)
        .in('user_id', profileIds),
    ]);
    if (eventsResult.error) throw new Error(eventsResult.error.message);
    if (collaboratorsResult.error) throw new Error(collaboratorsResult.error.message);

    for (const row of eventsResult.data ?? []) {
      ownedByUser.set(row.user_id, (ownedByUser.get(row.user_id) ?? 0) + 1);
    }
    for (const row of collaboratorsResult.data ?? []) {
      if (!row.user_id) continue;
      sharedByUser.set(row.user_id, (sharedByUser.get(row.user_id) ?? 0) + 1);
    }
  }

  const allRows: UserRow[] = profiles.map((profile) => ({
    id: profile.id,
    fullName: profile.full_name?.trim() || null,
    email: profile.email,
    phone: profile.phone_number,
    isAdmin: !!profile.is_admin,
    isTestAccount: !!profile.is_test_account,
    ownedEvents: ownedByUser.get(profile.id) ?? 0,
    sharedEvents: sharedByUser.get(profile.id) ?? 0,
    createdAt: profile.created_at,
  }));

  // Matches name, email and phone, ignoring whitespace so a spaced-out phone
  // number like "052 123 4567" is findable by its digits alone.
  const needle = filters.q.trim().toLocaleLowerCase('en').replace(/\s/g, '');
  const filtered = needle
    ? allRows.filter((row) => {
        const haystack = `${row.fullName ?? ''} ${row.email} ${row.phone ?? ''}`
          .toLocaleLowerCase('en')
          .replace(/\s/g, '');
        return haystack.includes(needle);
      })
    : allRows;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pageCount);
  const start = (page - 1) * PAGE_SIZE;

  return {
    rows: filtered.slice(start, start + PAGE_SIZE),
    totalRows: filtered.length,
    page,
    pageSize: PAGE_SIZE,
    pageCount,
    totalUsers: allRows.length,
    testAccountsTotal: testAccountsCount.count ?? 0,
  };
}

/**
 * The sheet's data. Returns null both when the id does not exist and when it
 * belongs to a test account currently hidden by the global toggle - the same
 * "not reachable while hidden" rule `getEventRouteState` applies to Events, so
 * a direct `?user=` link cannot resurrect a User the toggle is hiding.
 */
export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  await assertAdmin();
  const supabase = createServiceClient();
  const test = await getTestScope();
  if (test.userIds.includes(userId)) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone_number, is_admin, is_test_account, created_at, initial_setup_complete')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) return null;

  const [ownedResult, sharedResult] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, event_date, status')
      .eq('user_id', userId)
      .order('event_date', { ascending: true, nullsFirst: false }),
    // event_collaborators.event_id has exactly one foreign key to events, so
    // it embeds unqualified - see getEventIdentity for where two paths to the
    // same table force the `!constraint_name` form instead.
    supabase
      .from('event_collaborators')
      .select('role, events(id, title, event_date)')
      .eq('user_id', userId)
      .eq('is_creator', false),
  ]);
  if (ownedResult.error) throw new Error(ownedResult.error.message);
  if (sharedResult.error) throw new Error(sharedResult.error.message);

  return {
    id: profile.id,
    fullName: profile.full_name?.trim() || null,
    email: profile.email,
    phone: profile.phone_number,
    isAdmin: !!profile.is_admin,
    isTestAccount: !!profile.is_test_account,
    createdAt: profile.created_at,
    onboardingFinished: !!profile.initial_setup_complete,
    ownedEvents: (ownedResult.data ?? []).map((event) => ({
      id: event.id,
      title: event.title?.trim() || 'Untitled event',
      eventDate: event.event_date,
      status: event.status === 'draft' ? 'draft' : 'published',
    })),
    sharedEvents: (sharedResult.data ?? [])
      .map((row) => {
        const event = row.events as unknown as
          | { id: string; title: string | null; event_date: string | null }
          | null;
        if (!event) return null;
        return {
          id: event.id,
          title: event.title?.trim() || 'Untitled event',
          role: row.role as CollaboratorRole,
        };
      })
      .filter((row): row is UserSharedEvent => row !== null),
  };
}
