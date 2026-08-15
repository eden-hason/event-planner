import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';

/**
 * The onboarding takeover's own layout.
 *
 * Deliberately outside `/app`: the takeover is full-bleed with no sidebar, top
 * bar or bottom nav. Rendering it under the app shell is what makes today's
 * wizard feel wrong - a sidebar listing no events, and a nav to pages the user
 * cannot visit yet.
 */
export default async function StartLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return redirect({ href: '/login', locale });
  }

  return children;
}
