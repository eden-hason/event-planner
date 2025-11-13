import { GuestsContainer } from '@/components/guests-container';
import { GuestsDashboard } from '@/components/guests-dashboard';
import { getCurrentUser } from '@/lib/auth';
import { getGuestsForEvent, getUserEvent } from '@/lib/dal';
import { redirect } from 'next/navigation';

export default async function GuestsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const event = await getUserEvent(currentUser.id);
  if (!event) {
    redirect('/onboarding');
  }

  const guests = await getGuestsForEvent(event.id);

  return (
    <div className="space-y-6">
      <div className="mb-10">
        <GuestsDashboard guests={guests} />
      </div>
      <GuestsContainer guests={guests} eventId={event.id} />
    </div>
  );
}
