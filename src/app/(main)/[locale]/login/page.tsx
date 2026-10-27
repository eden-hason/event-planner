import { headers } from 'next/headers';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { detectInAppBrowser } from '@/lib/in-app-browser';
import { AuthTakeover } from '@/features/auth/components/auth-takeover';
import { isVisitor } from '@/features/auth';
import { getLastSignInMethod } from '@/features/auth/services/last-method';

/**
 * TEMPORARY. Records what a signed-out tap on an Owner Message's `/app` link
 * looks like, to learn how WhatsApp's in-app browser identifies itself before
 * building a "open in your browser" prompt for it. The headers besides the
 * user agent are the other places a WebView can give itself away: Chromium's
 * client hints name an "Android WebView" brand, and some WebViews still send
 * X-Requested-With with the host app's package name. Remove once the strings
 * are captured.
 */
async function logInAppBrowserProbe(next: string | undefined) {
  if (!next?.replace(/^\/en(?=\/|$)/, '').startsWith('/app')) return;
  const h = await headers();
  console.info('[login-ua]', {
    next,
    userAgent: h.get('user-agent'),
    secChUa: h.get('sec-ch-ua'),
    secChUaMobile: h.get('sec-ch-ua-mobile'),
    secChUaPlatform: h.get('sec-ch-ua-platform'),
    xRequestedWith: h.get('x-requested-with'),
    referer: h.get('referer'),
  });
}

// Force dynamic rendering since this page uses cookies for authentication
export const dynamic = 'force-dynamic';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; method?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // `method=phone` is onboarding's switch to the other Sign-in Method, which
  // has already chosen the phone (backlog 0029).
  const { next, method } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  // A Visitor (ADR 0028) has a session but no account: signing in is exactly
  // what they came here to do, so they get the form rather than a bounce.
  if (data.user && !isVisitor(data.user)) {
    redirect({ href: next || '/app', locale });
  }

  await logInAppBrowserProbe(next);

  const h = await headers();
  const inAppBrowser = detectInAppBrowser(h.get('user-agent'), h.get('sec-ch-ua'));
  const lastMethod = await getLastSignInMethod();

  // Signing in from here replaces a Visitor's session, and their Event goes
  // with it once the sign-in succeeds - so they are told before they start.
  return (
    <AuthTakeover
      next={next}
      holdsUnsavedEvent={isVisitor(data.user)}
      inAppBrowser={inAppBrowser}
      lastMethod={lastMethod}
      startAt={method === 'phone' ? 'phone' : 'choose'}
    />
  );
}
