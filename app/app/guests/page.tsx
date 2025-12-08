import { GuestDirectory } from '@/components/guests';
import { GuestsDashboard } from '@/components/guests-dashboard';
import { getCurrentUser } from '@/lib/auth';
import { getGuestsForEvent, getUserEvent } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function GuestsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const event = await getUserEvent(currentUser.id);
  if (!event) {
    redirect('/app/onboarding');
  }

  const guests = await getGuestsForEvent(event.id);

  return (
    <Card className="border-none p-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Guests</CardTitle>
        <CardAction>
          <Button>
            <PlusIcon className="size-4" />
            Add Guest
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        <GuestsDashboard guests={guests} />
        <GuestDirectory guests={guests} eventId={event.id} />
      </CardContent>
    </Card>
  );
}
