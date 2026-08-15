import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getDraftEvent, getLastUserEvent } from '@/features/events/queries';

// Both lookups read the session cookie, so this route can never be static.
// Declaring it keeps the prerender probe from attempting it and logging a
// dynamic-server-usage error on every build.
export const dynamic = 'force-dynamic';

export default async function AppPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // An unfinished event takes priority over a finished one: someone who
  // abandoned onboarding is returned to where they left off, not to a workspace
  // they have not created yet. A Draft Event never opens a dashboard - it may
  // not even have a date.
  const draft = await getDraftEvent();

  if (draft) {
    redirect({ href: '/start', locale });
  }

  const event = await getLastUserEvent();

  if (event?.id) {
    redirect({ href: `/app/${event.id}/dashboard`, locale });
  }

  redirect({ href: '/start', locale });
}
