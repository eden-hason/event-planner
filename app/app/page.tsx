import { redirect } from 'next/navigation';
import { getLastUserEvent } from '@/features/events/queries';

export default async function AppPage() {
  const event = await getLastUserEvent();

  if (event?.id) {
    redirect(`/app/${event.id}/dashboard`);
  }

  return <div>No event found</div>;
}
