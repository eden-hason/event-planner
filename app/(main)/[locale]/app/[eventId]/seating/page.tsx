import { getSeatingPageData } from '@/features/seating/queries';
import { SeatingPage } from '@/features/seating/components';
import { getEventGroups } from '@/features/guests/queries/groups';

export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [data, groups] = await Promise.all([
    getSeatingPageData(eventId),
    getEventGroups(eventId),
  ]);

  return (
    <SeatingPage
      eventId={eventId}
      tables={data.tables}
      guests={data.guests}
      unassignedGuests={data.unassignedGuests}
      stats={data.stats}
      groups={groups.map((g) => ({ id: g.id, name: g.name, icon: g.icon }))}
    />
  );
}
