import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

type ImpersonationContext = { userId: string } | null;

// Wrapped with React cache() so the auth + profile calls are deduplicated
// across the layout and page queries within a single render.
export const getImpersonation = cache(async function getImpersonation(): Promise<ImpersonationContext> {
  const cookieStore = await cookies();
  const impersonateId = cookieStore.get('impersonate_user_id')?.value;
  if (!impersonateId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return profile?.is_admin ? { userId: impersonateId } : null;
});

export async function getEffectiveClient() {
  const impersonation = await getImpersonation();
  const supabase = impersonation ? createServiceClient() : await createClient();
  return { supabase, impersonation };
}

type OperatorProfile = {
  /** null when the request carries no valid session at all. */
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
};

/**
 * The Operator's own profile row, read once per request.
 *
 * Every Back Office render used to read this one row twice - assertAdmin for
 * is_admin, getOperatorIdentity for email - for the same user, on the same
 * request, and updateSession reads it a third time before either of them runs.
 * That is fixed cost ahead of anything a page can stream: measured against
 * production, /admin/configuration, which is seven lines of static JSX and
 * makes no queries of its own, is as slow as /admin/users. The queries a page
 * runs are not what makes the Back Office feel slow; this chain is.
 *
 * Both callers now share one query through cache(), so asking for is_admin and
 * asking for the email together cost what asking for either used to.
 */
const readOperator = cache(async function readOperator(): Promise<OperatorProfile> {
  const supabase = await createClient();

  // getClaims rather than getUser, for the reason updateSession already spells
  // out in ./middleware.ts: getUser is a blocking round trip to /auth/v1/user,
  // and this runs on every Back Office render before the page can stream a
  // single byte. The project signs with ES256, so getClaims verifies the token
  // locally against a cached JWKS and only reaches the network to refresh.
  //
  // The weaker guarantee - a verified signature rather than a live server check
  // - costs nothing here, because the read below is a real query against the
  // row. A token whose user has been deleted finds no profile and redirects; an
  // account whose admin flag was revoked reads false and redirects. Only the
  // token's own expiry is taken on trust.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub ?? null;
  if (!userId) return { userId: null, email: null, isAdmin: false };

  // Read through the user's own client rather than the service client: the
  // profiles_select_own_or_shared_event policy already covers `id = auth.uid()`
  // for the whole row, so nothing here needs RLS bypassed.
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, is_admin')
    .eq('id', userId)
    .single();

  return { userId, email: profile?.email ?? null, isAdmin: !!profile?.is_admin };
});

export const assertAdmin = cache(async function assertAdmin(): Promise<string> {
  const { userId, isAdmin } = await readOperator();

  // The two failures stay distinct: no session means "sign in", a session
  // without the flag means "you are not an Operator", and they land in
  // different places. A missing profile row reads as the second, which is what
  // it was before this shared a query with getOperatorIdentity.
  if (!userId) redirect('/login');
  if (!isAdmin) redirect('/app');

  return userId;
});

/**
 * The Operator's email address, free to whoever has already called assertAdmin
 * on this request - it comes off the same cached row.
 */
export async function getOperatorEmail(): Promise<string | null> {
  const { email } = await readOperator();
  return email;
}

export async function assertNotImpersonating(): Promise<string | null> {
  const impersonation = await getImpersonation();
  return impersonation ? 'Read-only mode (impersonation)' : null;
}
