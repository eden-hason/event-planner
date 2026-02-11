import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client using the service role key.
 * This bypasses RLS and should only be used server-side for
 * operations where there is no authenticated user (e.g., public confirmation pages).
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
