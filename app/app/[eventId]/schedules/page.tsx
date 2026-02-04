import { SchedulesPage as SchedulesPageComponent } from '@/features/schedules/components';
import { getSchedulesByEventId } from '@/features/schedules/queries/schedules';

export default async function SchedulesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const schedules = await getSchedulesByEventId(eventId);

  return <SchedulesPageComponent schedules={schedules} eventId={eventId} />;
}
