import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

function getSubapp(host: string): string | null {
  if (host.startsWith('admin.')) return 'admin';
  if (host.startsWith('partners.')) return 'partners';
  return null;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const subapp = getSubapp(host);
  const pathname = request.nextUrl.pathname;

  // Subdomain routing: rewrite path and run auth only (no intl)
  if (subapp) {
    const rewrittenUrl = request.nextUrl.clone();
    rewrittenUrl.pathname = `/${subapp}${pathname === '/' ? '' : pathname}`;

    const authResponse = await updateSession(request, rewrittenUrl.pathname);
    if (authResponse.status >= 300) return authResponse;

    const rewriteResponse = NextResponse.rewrite(rewrittenUrl);
    authResponse.cookies.getAll().forEach((cookie) => rewriteResponse.cookies.set(cookie));
    return rewriteResponse;
  }

  // Direct /admin or /partners path (local dev — no subdomain)
  if (pathname.startsWith('/admin') || pathname.startsWith('/partners')) {
    return updateSession(request);
  }

  // Main app: intl + supabase
  const intlResponse = intlMiddleware(request);

  try {
    const supabaseResponse = await updateSession(request);

    if (supabaseResponse.status >= 300) {
      intlResponse.cookies.getAll().forEach((cookie) => {
        supabaseResponse.cookies.set(cookie);
      });
      return supabaseResponse;
    }

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
    '/((?!api|nav|auth/callback|auth/confirm|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
