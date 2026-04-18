import { type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // next-intl handles locale detection and rewrites (e.g. /app → /he/app internally)
  const intlResponse = intlMiddleware(request);

  try {
    const supabaseResponse = await updateSession(request);

    // If Supabase wants to redirect (e.g. unauthenticated → /login),
    // use that redirect but carry over any intl cookies
    if (supabaseResponse.status >= 300) {
      intlResponse.cookies.getAll().forEach((cookie) => {
        supabaseResponse.cookies.set(cookie);
      });
      return supabaseResponse;
    }

    // Otherwise return the intl response (preserves rewrite headers) with
    // Supabase auth cookies merged in so the session stays fresh
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      intlResponse.cookies.set(cookie);
    });

    return intlResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    return intlResponse;
  }
}

export const config = {
  matcher: [
    // Exclude api, static assets, and Supabase auth route handlers from locale routing
    '/((?!api|auth/callback|auth/confirm|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
