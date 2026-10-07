import { setRequestLocale } from 'next-intl/server';

/**
 * The onboarding takeover's own layout.
 *
 * Deliberately outside `/app`: the takeover is full-bleed with no sidebar, top
 * bar or bottom nav. Rendering it under the app shell is what makes today's
 * wizard feel wrong - a sidebar listing no events, and a nav to pages the user
 * cannot visit yet.
 *
 * No session check: the takeover is the front door, open to someone with no
 * account, who becomes a Visitor on their first answer (ADR 0028).
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

  return children;
}
