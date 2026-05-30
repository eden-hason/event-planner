import { getAdminEventSchedules } from '@/features/admin/queries/event-detail';
import { ManualSendCard } from '@/features/admin/components/manual-send-card';
import { TriggerScheduleCard } from '@/features/admin/components/trigger-schedule-card';

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const schedules = await getAdminEventSchedules(eventId);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <ManualSendCard eventId={eventId} schedules={schedules} />
        <TriggerScheduleCard eventId={eventId} schedules={schedules} />
      </div>
    </div>
  );
}
