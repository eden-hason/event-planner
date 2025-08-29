'use client';

import { useState } from 'react';
import { GuestSearch } from './guest-search';
import { GuestsTable } from './guests-table';
import { AddGuestModal } from './add-guest-modal';
import { Guest } from '@/lib/dal';
import { GuestData } from '@/app/actions/guests';

interface GuestsContainerProps {
  guests: Guest[];
  eventId: string;
}

export function GuestsContainer({ guests, eventId }: GuestsContainerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleGuestAdded = (guestData: GuestData) => {
    console.log('handleGuestAdded:', guestData);
  };

  return (
    <div className="space-y-6">
      {/* Header with search and add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-1 max-w-sm">
          <GuestSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </div>
        <AddGuestModal eventId={eventId} onGuestAdded={handleGuestAdded} />
      </div>

      {/* Guests table */}
      <GuestsTable guests={guests} searchTerm={searchTerm} />
    </div>
  );
}
