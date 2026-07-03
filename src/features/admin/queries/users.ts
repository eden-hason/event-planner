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

  // Count events per user in one query
  const { data: eventCounts } = await supabase
    .from('events')
    .select('user_id')
    .in('user_id', ids);

  const countMap = new Map<string, number>();
  for (const row of eventCounts ?? []) {
    countMap.set(row.user_id, (countMap.get(row.user_id) ?? 0) + 1);
  }

  return profiles.map((p) => ({
    id: p.id,
    email: p.email ?? '',
    fullName: p.full_name ?? '',
    plan: p.pricing_plan ?? 'basic',
    signupDate: p.created_at,
    eventCount: countMap.get(p.id) ?? 0,
    isAdmin: p.is_admin ?? false,
  }));
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

  const { count } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    id: profile.id,
    email: profile.email ?? '',
    fullName: profile.full_name ?? '',
    plan: profile.pricing_plan ?? 'basic',
    signupDate: profile.created_at,
    eventCount: count ?? 0,
    isAdmin: profile.is_admin ?? false,
  };
}
