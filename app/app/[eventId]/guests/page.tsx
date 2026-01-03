import {
  getEventGuestsWithGroups,
  getEventGuestPhones,
} from '@/features/guests/queries';
import { getEventGroupsWithGuests } from '@/features/guests/queries/groups';
import { GuestsPage as GuestsPageComponent } from '@/features/guests/components';

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [guests, groups, existingPhones] = await Promise.all([
    getEventGuestsWithGroups(eventId),
    getEventGroupsWithGuests(eventId),
    getEventGuestPhones(eventId),
  ]);

  return (
    <GuestsPageComponent
      guests={guests}
      eventId={eventId}
      groups={groups}
      existingPhones={existingPhones}
    />
  );
}
