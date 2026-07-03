import { getTranslations } from 'next-intl/server';
import { getEventById } from '@/features/events/queries';
import { EventDetailsWrapper } from '@/features/events/components';

export default async function EventDetailsServerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [event, t] = await Promise.all([getEventById(eventId), getTranslations('eventDetails')]);

  if (!event) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t('notFound')}</p>
      </div>
    );
  }

  return <EventDetailsWrapper event={event} />;
}
