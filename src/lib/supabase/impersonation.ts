import { cache } from 'react';
import { cookies } from 'next/headers';
import { createSessionClient } from './session';

/**
 * `readOnly` is decided here, once: locally the Operator acts with a real
 * session as the Owner (see createClient in ./server); on production the app
 * cannot sign one, so impersonation there only reads.
 */
export type ImpersonationContext = { userId: string; readOnly: boolean } | null;

/**
 * Whether the app is pointed at the local Supabase stack rather than
 * production. Keyed off the database URL, not NODE_ENV: `npm run dev` against
 * production credentials is still production data.
 */
export function isLocalDatabase(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return url.includes('127.0.0.1') || url.includes('localhost');
}

// Wrapped with React cache() so the auth + profile calls are deduplicated
// across the layout and page queries within a single render.
export const getImpersonation = cache(async function getImpersonation(): Promise<ImpersonationContext> {
  const cookieStore = await cookies();
  const impersonateId = cookieStore.get('impersonate_user_id')?.value;
  if (!impersonateId) return null;

  // The Operator's own session, never createClient: locally that is the
  // impersonated Owner's session, and it is this check that decides it.
  // getClaims rather than getUser, as in readOperator (./admin): the profile
  // read below is the live check, so a network round trip adds nothing.
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  const operatorId = data?.claims.sub;
  if (!operatorId) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', operatorId)
    .single();

  return profile?.is_admin
    ? { userId: impersonateId, readOnly: !isLocalDatabase() }
    : null;
});
