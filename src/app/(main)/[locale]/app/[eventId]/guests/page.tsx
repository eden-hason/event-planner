import {
  getEventGuestsWithGroups,
  getEventGuestPhones,
} from '@/features/guests/queries';
import { getEventGroupsWithGuests } from '@/features/guests/queries/groups';
import { getEventMessagedGuestIds } from '@/features/guests/queries/activity';
import { getChangedAnswerSnapshots } from '@/features/guests/queries/changed-answers';
import { findChangedAnswers } from '@/features/guests/utils/changed-answers';
import { getMissedCatchUpInput } from '@/features/schedules/queries/missed-catch-up';
import { missedCatchUpIds } from '@/features/schedules/utils/catch-up';
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
    missedCatchUpInput,
    changedAnswerSnapshots,
  ] = await Promise.all([
    getEventGuestsWithGroups(eventId),
    getEventGroupsWithGuests(eventId),
    getEventGuestPhones(eventId),
    getEventById(eventId),
    getEventTableOptions(eventId),
    getEventMessagedGuestIds(eventId),
    getGuestPackageView(eventId),
    getMissedCatchUpInput(eventId),
    getChangedAnswerSnapshots(eventId),
  ]);

  const showDietary = event?.guestExperience?.dietaryOptions ?? false;
  const showTransportation = event?.guestExperience?.askTransportation ?? false;

  return (
    <GuestsPageComponent
      guests={guests}
      eventId={eventId}
      eventName={event?.title}
      groups={groups}
      existingPhones={existingPhones}
      showDietary={showDietary}
      showTransportation={showTransportation}
      tables={tables}
      messagedGuestIds={messagedGuestIds}
      missedCatchUpIds={
        missedCatchUpInput ? missedCatchUpIds(guests, missedCatchUpInput) : []
      }
      changedAnswerIds={
        changedAnswerSnapshots
          ? findChangedAnswers(
              guests.map((guest) => ({
                ...guest,
                phone: guest.phone ?? null,
                rsvpChangeSource: guest.rsvpChangeSource ?? null,
                rsvpChangedAt: guest.rsvpChangedAt ?? null,
              })),
              changedAnswerSnapshots,
            ).map((answer) => answer.guestId)
          : []
      }
      recordPackage={recordPackage}
    />
  );
}
