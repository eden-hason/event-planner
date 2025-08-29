'use client';

import { useState } from 'react';
import { GuestSearch } from './guest-search';
import { GuestsTable } from './guests-table';
import { Guest } from '@/lib/dal';

interface GuestsContainerProps {
  guests: Guest[];
  eventId: string;
}

export function GuestsContainer({ guests, eventId }: GuestsContainerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Header with search and add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-1 max-w-sm">
          <GuestSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </div>
      </div>

      {/* Guests table */}
      <GuestsTable guests={guests} searchTerm={searchTerm} />
    </div>
  );
}
