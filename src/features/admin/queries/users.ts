'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { AdminUser } from '../types';

export async function listUsers(): Promise<AdminUser[]> {
  await assertAdmin();
  const supabase = createServiceClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, pricing_plan, created_at, is_admin')
    .order('created_at', { ascending: false });

  if (error || !profiles) {
    console.error('Error fetching users:', error);
    return [];
  }

  const ids = profiles.map((p) => p.id);

  // Count events per user in one query. Drafts are counted separately: an
  // abandoned draft is a record of interest, not an event the user has, and
  // folding the two together overstates how many events exist.
  const { data: eventCounts } = await supabase
    .from('events')
    .select('user_id, status')
    .in('user_id', ids);

  const countMap = new Map<string, { published: number; draft: number }>();
  for (const row of eventCounts ?? []) {
    const entry = countMap.get(row.user_id) ?? { published: 0, draft: 0 };
    if (row.status === 'draft') entry.draft++;
    else entry.published++;
    countMap.set(row.user_id, entry);
  }

  return profiles.map((p) => {
    const counts = countMap.get(p.id) ?? { published: 0, draft: 0 };
    return {
      id: p.id,
      email: p.email ?? '',
      fullName: p.full_name ?? '',
      plan: p.pricing_plan ?? 'basic',
      signupDate: p.created_at,
      eventCount: counts.published,
      draftCount: counts.draft,
      isAdmin: p.is_admin ?? false,
    };
  });
}

export async function getUserById(userId: string): Promise<AdminUser | null> {
  await assertAdmin();
  const supabase = createServiceClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, pricing_plan, created_at, is_admin')
    .eq('id', userId)
    .single();

  if (error || !profile) return null;

  const [{ count: publishedCount }, { count: draftCount }] = await Promise.all([
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('status', 'draft'),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'draft'),
  ]);

  return {
    id: profile.id,
    email: profile.email ?? '',
    fullName: profile.full_name ?? '',
    plan: profile.pricing_plan ?? 'basic',
    signupDate: profile.created_at,
    eventCount: publishedCount ?? 0,
    draftCount: draftCount ?? 0,
    isAdmin: profile.is_admin ?? false,
  };
}
