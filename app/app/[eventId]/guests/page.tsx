import { getEventGuestsWithGroups } from '@/features/guests/queries';
import { getEventGroupsWithGuests } from '@/features/guests/queries/groups';
import { GuestsPage as GuestsPageComponent } from '@/features/guests/components';

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const guests = await getEventGuestsWithGroups(eventId);
  const groups = await getEventGroupsWithGuests(eventId);

  return (
    <GuestsPageComponent guests={guests} eventId={eventId} groups={groups} />
  );
}
