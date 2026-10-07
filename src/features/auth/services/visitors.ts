import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Visitor housekeeping (ADR 0028). Takes a service-role client:
 * deleting auth users is an admin operation no session may perform. Forgetting
 * a single Visitor at sign-in lives with the session cookies, in
 * `./visitor-session`.
 */

/** The Sweeper's pass: forget Visitors who left their draft for 30 days. */
export async function purgeAbandonedVisitors(
  supabase: SupabaseClient,
): Promise<{ purged: number }> {
  const { data, error } = await supabase.rpc('purge_abandoned_visitors', { p_limit: 200 });
  if (error) {
    console.error('[visitors] purge failed:', error.message);
    return { purged: 0 };
  }
  return { purged: data ?? 0 };
}
