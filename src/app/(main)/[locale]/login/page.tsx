import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { AuthTakeover } from '@/features/auth/components/auth-takeover';

// Force dynamic rendering since this page uses cookies for authentication
export const dynamic = 'force-dynamic';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { next } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  // A Visitor (ADR 0028) has a session but no account: signing in is exactly
  // what they came here to do, so they get the form rather than a bounce.
  if (data.user && !data.user.is_anonymous) {
    redirect({ href: next || '/app', locale });
  }

  // Signing in from here replaces a Visitor's session, and their Event goes
  // with it once the sign-in succeeds - so they are told before they start.
  return <AuthTakeover next={next} holdsUnsavedEvent={!!data.user?.is_anonymous} />;
}
