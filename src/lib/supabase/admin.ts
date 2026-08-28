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

export const assertAdmin = cache(async function assertAdmin(): Promise<string> {
  const supabase = await createClient();

  // getClaims rather than getUser, for the reason updateSession already spells
  // out in ./middleware.ts: getUser is a blocking round trip to /auth/v1/user,
  // and this runs on every Back Office render before the page can stream a
  // single byte. The project signs with ES256, so getClaims verifies the token
  // locally against a cached JWKS and only reaches the network to refresh.
  //
  // The weaker guarantee - a verified signature rather than a live server check
  // - costs nothing here, because the is_admin read below is a real query
  // against the row. A token whose user has been deleted finds no profile and
  // redirects; an account whose admin flag was revoked reads false and
  // redirects. Only the token's own expiry is taken on trust.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub ?? null;

  if (!userId) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (!profile?.is_admin) redirect('/app');

  return userId;
});

export async function assertNotImpersonating(): Promise<string | null> {
  const impersonation = await getImpersonation();
  return impersonation ? 'Read-only mode (impersonation)' : null;
}
