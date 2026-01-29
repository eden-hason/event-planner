import { SchedulesPage } from '@/features/schedules/components';
import { getEventSchedules } from '@/features/schedules/queries/schedules';
import { getEventById } from '@/features/events/queries';

export default async function SchedulesServerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [schedules, event] = await Promise.all([
    getEventSchedules(eventId),
    getEventById(eventId),
  ]);

  return <SchedulesPage schedules={schedules} eventDate={event?.eventDate} />;
}
