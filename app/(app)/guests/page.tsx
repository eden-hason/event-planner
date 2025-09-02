import { GuestData } from '@/app/actions/guests';
import { getCurrentUser } from '@/lib/auth';
import { getGuests } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { GuestsContainer } from '@/components/guests-container';

export default async function GuestsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const eventId = 'event1'; // TODO: Get this from URL params or context
  const guests = await getGuests(currentUser.uid, eventId);
  return (
    <div className="space-y-6">
      <GuestsContainer guests={guests} eventId={eventId} />
    </div>
  );
}
