import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getLastUserEvent } from '@/features/events/queries';

export default async function AppPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const event = await getLastUserEvent();

  if (event?.id) {
    redirect({ href: `/app/${event.id}/dashboard`, locale });
  }

  return <div>No event found</div>;
}
