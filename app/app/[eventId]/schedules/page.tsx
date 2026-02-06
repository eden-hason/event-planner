import { getEventById } from '@/features/events/queries';
import { SchedulesPage as SchedulesPageComponent } from '@/features/schedules/components';
import { getSchedulesByEventId } from '@/features/schedules/queries/schedules';

export default async function SchedulesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [schedules, event] = await Promise.all([
    getSchedulesByEventId(eventId),
    getEventById(eventId),
  ]);

  return (
    <SchedulesPageComponent
      schedules={schedules}
      eventId={eventId}
      eventDate={event?.eventDate ?? ''}
    />
  );
}
