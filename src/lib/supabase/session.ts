import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * A server client for whoever is actually signed in, from the session cookies.
 *
 * Almost everything should use `createClient` from ./server instead, which is
 * this same client except while an Operator impersonates an Owner locally.
 * This one is for the few places that must see the Operator themselves - the
 * checks that decide whether impersonation is allowed at all.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
