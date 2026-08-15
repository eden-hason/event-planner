import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getDraftEvent, getLastUserEvent } from '@/features/events/queries';

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
    redirect({ href: '/app/new-event', locale });
  }

  const event = await getLastUserEvent();

  if (event?.id) {
    redirect({ href: `/app/${event.id}/dashboard`, locale });
  }

  redirect({ href: '/app/new-event', locale });
}
