import { getTranslations } from 'next-intl/server';
import { getEventById } from '@/features/events/queries';
import { EventDetailsWrapper } from '@/features/events/components';
import { getSchedulesByEventId } from '@/features/schedules/queries';
import { summariseOutstandingPlan } from '@/features/schedules/utils/outstanding-plan';

export default async function EventDetailsServerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  // The plan is fetched alongside the Event because moving the Event's date does
  // not move its Schedules (docs/backlog/0008), and the page can only say how
  // much would be left behind if it knows what is still outstanding.
  const [event, schedules, t] = await Promise.all([
    getEventById(eventId),
    getSchedulesByEventId(eventId),
    getTranslations('eventDetails'),
  ]);

  if (!event) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t('notFound')}</p>
      </div>
    );
  }

  return (
    <EventDetailsWrapper
      event={event}
      plan={summariseOutstandingPlan(schedules)}
    />
  );
}
