import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server';
import { updateUserProfile } from '@/features/auth';
import { settleRememberedVisitor } from '@/features/auth/services/visitor-session';
import {
  isExistingAccountError,
  isVisitor,
  safeReturnPath,
  SAVE_NAME_COOKIE,
  SAVE_RETURN_COOKIE,
} from '@/features/auth/utils/visitor';

/**
 * Where Google sends everyone back. Three arrivals:
 *
 *   - an ordinary sign-in: exchange the code, forget any Visitor whose session
 *     this replaced (ADR 0028), go on to `next`
 *   - a Visitor saving with Google (`save=1`) whose link worked: they are now
 *     the Owner of their Event, so write their profile and return them to
 *     where they opened the save dialog
 *   - a Visitor saving with a Google account that already has a Kululu
 *     account: the session is still the Visitor's and nothing is lost yet, so
 *     return them with `?save=exists`, where the dialog asks what to do
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const isSave = searchParams.get('save') === '1';
  const next = safeReturnPath(searchParams.get('next'), '/');

  const supabase = await createClient();

  if (isSave) {
    const store = await cookies();
    const returnTo = safeReturnPath(store.get(SAVE_RETURN_COOKIE)?.value);
    const typedName = store.get(SAVE_NAME_COOKIE)?.value;
    store.delete(SAVE_RETURN_COOKIE);
    store.delete(SAVE_NAME_COOKIE);

    if (!code) {
      const exists = isExistingAccountError(searchParams.get('error_code'));
      // Cancelled at Google or failed: back where they were, Event intact.
      return redirectTo(request, exists ? withParam(returnTo, 'save', 'exists') : returnTo);
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user && !isVisitor(data.user)) {
      // Linking Google to the Visitor leaves user_metadata as the anonymous
      // user's (empty) - Google's name and picture are only on the identity.
      const google = data.user.identities?.find(
        (identity) => identity.provider === 'google',
      )?.identity_data;
      const formData = new FormData();
      formData.set(
        'full_name',
        typedName || google?.full_name || google?.name || '',
      );
      const picture = google?.avatar_url || google?.picture;
      if (picture) formData.set('avatar_url', picture);
      if (data.user.email) formData.set('email', data.user.email);
      await updateUserProfile(formData);
    }
    return redirectTo(request, returnTo);
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await settleRememberedVisitor(data.user.id);
      return redirectTo(request, next);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

function withParam(path: string, key: string, value: string): string {
  const url = new URL(path, 'http://x');
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

/** This site's public origin - behind Vercel's proxy, the forwarded host. */
function siteOrigin(request: Request): string {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
  const isLocalEnv = process.env.NODE_ENV === 'development';
  // Locally there is no load balancer in between, so no need to watch for X-Forwarded-Host
  if (isLocalEnv || !forwardedHost) return origin;
  return `https://${forwardedHost}`;
}

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(`${siteOrigin(request)}${path}`);
}
