import { getTranslations } from 'next-intl/server';
import { getEventById } from '@/features/events/queries';
import { GiftingPage } from '@/features/gifting';

export default async function GiftingPageRoute({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [event, t] = await Promise.all([
    getEventById(eventId),
    getTranslations('gifting'),
  ]);

  if (!event) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t('notFound')}</p>
      </div>
    );
  }

  return <GiftingPage event={event} />;
}
