import { getTranslations } from 'next-intl/server';
import { getEventById } from '@/features/events/queries';
import { GiftingPage } from '@/features/gifting';
import { getScheduleGiftButtons } from '@/features/gifting/queries';

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

  // On the current Message Plan the switches live on the Schedules (ADR 0053).
  const scheduleGiftButtons =
    event.messagePlan === 'current' ? await getScheduleGiftButtons(event.id) : undefined;

  return <GiftingPage event={event} scheduleGiftButtons={scheduleGiftButtons} />;
}
