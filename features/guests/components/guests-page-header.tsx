import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { CardAction, CardHeader, CardTitle } from '@/components/ui/card';

interface GuestsPageHeaderProps {
  onAddGuest?: () => void;
}

export function GuestsPageHeader({ onAddGuest }: GuestsPageHeaderProps) {
  return (
    <CardHeader>
      <CardTitle className="text-2xl font-bold">Guests</CardTitle>
      <CardAction>
        <Button onClick={onAddGuest}>
          <PlusIcon className="size-4" />
          Add Guest
        </Button>
      </CardAction>
    </CardHeader>
  );
}
