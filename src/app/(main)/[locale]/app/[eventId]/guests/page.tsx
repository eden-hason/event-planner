import {
  getEventGuestsWithGroups,
  getEventGuestPhones,
  getGuestsWithInitialInvitation,
} from '@/features/guests/queries';
import { getEventGroupsWithGuests } from '@/features/guests/queries/groups';
import { GuestsPage as GuestsPageComponent } from '@/features/guests';
import { getEventById } from '@/features/events/queries';
import { getCurrentUser } from '@/features/auth/queries';
import { getEventTableOptions } from '@/features/seating/queries';

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [
    guests,
    groups,
    existingPhones,
    event,
    currentUser,
    initialInvitedIds,
    tables,
  ] = await Promise.all([
    getEventGuestsWithGroups(eventId),
    getEventGroupsWithGuests(eventId),
    getEventGuestPhones(eventId),
    getEventById(eventId),
    getCurrentUser(),
    getGuestsWithInitialInvitation(eventId),
    getEventTableOptions(eventId),
  ]);

  const showDietary = event?.guestExperience?.dietaryOptions ?? false;
  const capacity = event?.guestsCapacity ?? null;

  return (
    <GuestsPageComponent
      guests={guests}
      eventId={eventId}
      eventName={event?.title}
      groups={groups}
      existingPhones={existingPhones}
      showDietary={showDietary}
      tables={tables}
      currentUserId={currentUser?.id ?? null}
      initialInvitedGuestIds={[...initialInvitedIds]}
      capacity={capacity}
    />
  );
}
