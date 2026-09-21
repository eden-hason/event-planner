import { createServerClient } from '@supabase/ssr';

import { getImpersonation, isLocalDatabase } from './impersonation';
import { signLocalAccessToken } from './owner-token';
import { createSessionClient } from './session';

/**
 * The server client for Server Components, Server Actions and route handlers.
 *
 * Normally the signed-in user's own session. While an Operator impersonates an
 * Owner against the local database, it is instead a session *as the Owner*: a
 * locally signed token, so every query, RLS policy and `auth.getUser()` in the
 * app behaves exactly as it would for them, with no per-action special case.
 * Production never takes this path - the app does not hold production's
 * signing key - so impersonation there stays read-only (assertNotImpersonating).
 */
export async function createClient() {
  if (isLocalDatabase()) {
    const impersonation = await getImpersonation();
    if (impersonation) return createOwnerClient(impersonation.userId);
  }
  return createSessionClient();
}

/**
 * A client carrying a session for `userId` that lives only in memory: it is
 * read from a cookie store of its own and never written back, so the
 * Operator's real session cookies are left exactly as they were.
 */
function createOwnerClient(userId: string) {
  const { token, expiresAt } = signLocalAccessToken(userId);
  const name = 'sb-impersonated-owner-auth-token';
  const session = {
    access_token: token,
    token_type: 'bearer',
    expires_in: expiresAt - Math.floor(Date.now() / 1000),
    expires_at: expiresAt,
    // Never used: the token outlives any one request, and a refresh would have
    // nowhere to write to.
    refresh_token: 'impersonation',
    user: { id: userId, aud: 'authenticated', role: 'authenticated' },
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { name },
      cookies: {
        getAll() {
          return [{ name, value: JSON.stringify(session) }];
        },
        setAll() {},
      },
    },
  );
}
