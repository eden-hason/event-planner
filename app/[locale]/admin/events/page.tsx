import { listAllEvents } from '@/features/admin/queries';
import { EventsTable } from '@/features/admin/components/events-table';

export default async function AdminEventsPage() {
  const events = await listAllEvents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {events.length} event{events.length !== 1 ? 's' : ''} across all users
        </p>
      </div>
      <EventsTable events={events} />
    </div>
  );
}
