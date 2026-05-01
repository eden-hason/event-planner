import {
  getEventGuestsWithGroups,
  getEventGuestPhones,
  getGuestsWithInitialInvitation,
} from '@/features/guests/queries';
import { getEventGroupsWithGuests } from '@/features/guests/queries/groups';
import { GuestsPage as GuestsPageComponent } from '@/features/guests/components';
import { getEventById } from '@/features/events/queries';
import { getCurrentUser } from '@/features/auth/queries';

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [guests, groups, existingPhones, event, currentUser, initialInvitedIds] = await Promise.all([
    getEventGuestsWithGroups(eventId),
    getEventGroupsWithGuests(eventId),
    getEventGuestPhones(eventId),
    getEventById(eventId),
    getCurrentUser(),
    getGuestsWithInitialInvitation(eventId),
  ]);

  const showDietary = event?.guestExperience?.dietaryOptions ?? false;
  const capacity = event?.guestsCapacity ?? null;

  return (
    <GuestsPageComponent
      guests={guests}
      eventId={eventId}
      groups={groups}
      existingPhones={existingPhones}
      showDietary={showDietary}
      currentUserId={currentUser?.id ?? null}
      initialInvitedGuestIds={[...initialInvitedIds]}
      capacity={capacity}
    />
  );
}
