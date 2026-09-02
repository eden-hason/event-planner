import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { PartnerSession } from '../types';

/**
 * The signed-in Partner, read once per request.
 *
 * getClaims rather than getUser, for the reason ../../../lib/supabase/middleware.ts
 * spells out: the project signs with ES256, so the claims are verified locally
 * against a cached JWKS instead of a blocking round trip to /auth/v1/user on
 * every render.
 */
const readPartner = cache(async function readPartner(): Promise<PartnerSession | null> {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  return {
    userId: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : null,
    phone: typeof claims.phone === 'string' && claims.phone ? claims.phone : null,
  };
});

export async function getPartnerSession(): Promise<PartnerSession | null> {
  return readPartner();
}

/**
 * The gate every Partners page and Server Action goes through.
 *
 * The proxy already turns anonymous requests away at the edge, but that guard
 * covers page navigations only - Server Actions and route handlers never pass
 * through it - so the check is repeated here, the same way the Back Office
 * repeats assertAdmin behind its layout.
 *
 * Today "is a Partner" means no more than "has a session": there is no
 * partners table yet, so there is nothing to vet a user against. When
 * admin-vetted Partner records land, this is the one place that has to learn
 * about them.
 */
export async function assertPartner(): Promise<PartnerSession> {
  const session = await readPartner();
  if (!session) redirect('/login');
  return session;
}
