import { GuestDirectory } from '@/components/guests';
import { GuestsDashboard } from '@/components/guests-dashboard';
import { getGuestsForEvent } from '@/lib/dal';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const guests = await getGuestsForEvent(eventId);

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
        <GuestDirectory guests={guests} eventId={eventId} />
      </CardContent>
    </Card>
  );
}
