import { getEventById } from '@/features/events/queries';
import { EventDetailsWrapper } from '@/features/events/components';

export default async function EventDetailsServerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEventById(eventId);

  if (!event) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  return <EventDetailsWrapper event={event} />;
}
