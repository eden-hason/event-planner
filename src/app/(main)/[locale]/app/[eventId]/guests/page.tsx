import {
  getEventGuestsWithGroups,
  getEventGuestPhones,
} from '@/features/guests/queries';
import { getEventGroupsWithGuests } from '@/features/guests/queries/groups';
import { getEventMessagedGuestIds } from '@/features/guests/queries/activity';
import { GuestsPage as GuestsPageComponent } from '@/features/guests';
import { getEventById } from '@/features/events/queries';
import { getEventTableOptions } from '@/features/seating/queries';
import { getGuestPackageView } from '@/features/billing/queries';

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
    tables,
    messagedGuestIds,
    recordPackage,
  ] = await Promise.all([
    getEventGuestsWithGroups(eventId),
    getEventGroupsWithGuests(eventId),
    getEventGuestPhones(eventId),
    getEventById(eventId),
    getEventTableOptions(eventId),
    getEventMessagedGuestIds(eventId),
    getGuestPackageView(eventId),
  ]);

  const showDietary = event?.guestExperience?.dietaryOptions ?? false;

  return (
    <GuestsPageComponent
      guests={guests}
      eventId={eventId}
      eventName={event?.title}
      groups={groups}
      existingPhones={existingPhones}
      showDietary={showDietary}
      tables={tables}
      messagedGuestIds={messagedGuestIds}
      recordPackage={recordPackage}
    />
  );
}
