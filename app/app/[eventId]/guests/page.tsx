import { getEventGuests } from '@/features/guests/queries';
import { GuestsPage as GuestsPageComponent } from '@/features/guests/components';

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const guests = await getEventGuests(eventId);

  return <GuestsPageComponent guests={guests} eventId={eventId} />;
}
