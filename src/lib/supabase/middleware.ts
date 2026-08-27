import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest, effectivePath?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: DO NOT REMOVE auth.getClaims(). It is what refreshes the session
  // cookie; without it users get randomly logged out under server-side rendering.
  //
  // getClaims rather than getUser: this runs on every request the matcher
  // catches, RSC prefetches included, so a single navigation used to fire ~18
  // calls to /auth/v1/user - 88% of the project's auth traffic - each one a
  // blocking round trip before the page could render. The project signs JWTs
  // with an asymmetric key (ES256), so getClaims verifies the token locally via
  // WebCrypto against a cached JWKS and only reaches the network to refresh.
  // It still verifies cryptographically, so the guards below are as safe as
  // they were with getUser.

  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    userId = data?.claims.sub ?? null;
  } catch (error) {
    console.error('Error getting user from Supabase:', error);
  }

  // effectivePath is passed by middleware for subdomain rewrites so path-based
  // guards see the rewritten path (e.g. /admin/users) rather than the original (e.g. /users)
  const rawPath = effectivePath ?? request.nextUrl.pathname;
  const strippedPath = rawPath.replace(/^\/en/, '') || '/';

  if (
    !userId &&
    strippedPath !== '/' &&
    !strippedPath.startsWith('/login') &&
    !strippedPath.startsWith('/auth') &&
    !strippedPath.startsWith('/error') &&
    !strippedPath.startsWith('/confirm') &&
    // Exact segment match - a bare startsWith('/c') would open up every route
    // beginning with c, /collaborate among them
    strippedPath !== '/c' &&
    !strippedPath.startsWith('/c/') &&
    !strippedPath.startsWith('/invitations') &&
    !strippedPath.startsWith('/privacy') &&
    !strippedPath.startsWith('/terms') &&
    !strippedPath.startsWith('/nav')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', rawPath);
    return NextResponse.redirect(url);
  }

  // Guard /admin routes: require is_admin = true on the user's profile
  if (userId && strippedPath.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/app';
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. See
  // https://supabase.com/docs/guides/auth/server-side/nextjs for details.

  return supabaseResponse;
}
