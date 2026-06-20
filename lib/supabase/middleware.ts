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

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  let user = null;
  try {
    const {
      data: { user: userData },
    } = await supabase.auth.getUser();
    user = userData;
  } catch (error) {
    console.error('Error getting user from Supabase:', error);
  }

  // effectivePath is passed by middleware for subdomain rewrites so path-based
  // guards see the rewritten path (e.g. /admin/users) rather than the original (e.g. /users)
  const rawPath = effectivePath ?? request.nextUrl.pathname;
  const strippedPath = rawPath.replace(/^\/en/, '') || '/';

  if (
    !user &&
    strippedPath !== '/' &&
    !strippedPath.startsWith('/login') &&
    !strippedPath.startsWith('/auth') &&
    !strippedPath.startsWith('/error') &&
    !strippedPath.startsWith('/confirm') &&
    !strippedPath.startsWith('/invitations') &&
    !strippedPath.startsWith('/privacy') &&
    !strippedPath.startsWith('/nav')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', rawPath);
    return NextResponse.redirect(url);
  }

  // Guard /admin routes: require is_admin = true on the user's profile
  if (user && strippedPath.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
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
