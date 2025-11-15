'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { GuestSearch } from '@/components/guest-search';
import { GuestsTable } from './table';
import { GroupFilter } from './filters';
import { Button } from '@/components/ui/button';
import { GuestForm } from '@/components/guest-form';
import { GuestApp } from '@/lib/schemas/guest.schema';
import { PlusIcon, CalendarSync } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { useGuestFilters } from '@/hooks/guests/use-guest-filters';

interface GuestsContainerProps {
  guests: GuestApp[];
  eventId: string;
}

export function GuestsContainer({ guests, eventId }: GuestsContainerProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestApp | null>(null);

  const {
    searchTerm,
    setSearchTerm,
    selectedGroups,
    uniqueGroups,
    handleGroupToggle,
    handleSelectAllGroups,
    isAllSelected,
  } = useGuestFilters(guests);

  const handleSelectGuest = (id: string) => {
    const guest = guests.find((guest) => guest.id === id);
    setSelectedGuest(guest || null);
    setIsDrawerOpen(true);
  };

  const handleAddGuestClick = () => {
    setSelectedGuest(null);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) {
      setSelectedGuest(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with search, filter and buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 flex-1 max-w-2xl">
          <GuestSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          <GroupFilter
            groups={uniqueGroups}
            selectedGroups={selectedGroups}
            onGroupToggle={handleGroupToggle}
            onSelectAll={handleSelectAllGroups}
            isAllSelected={isAllSelected}
          />
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={handleAddGuestClick}
        >
          <PlusIcon className="size-4" />
          Add Guest
        </Button>
      </div>

      {/* Guests table */}
      <GuestsTable
        guests={guests}
        searchTerm={searchTerm}
        groupFilter={selectedGroups}
        onSelectGuest={handleSelectGuest}
      />

      {/* Guest form drawer */}
      <Drawer
        direction="right"
        open={isDrawerOpen}
        onOpenChange={handleDrawerClose}
      >
        <DrawerContent className="!max-w-[600px]">
          <DrawerHeader>
            <DrawerTitle>
              {selectedGuest ? `Edit ${selectedGuest.name}` : 'Add New Guest'}
            </DrawerTitle>
            <DrawerDescription>
              {selectedGuest ? (
                <span className="flex items-center gap-2">
                  <CalendarSync className="size-4" />
                  Last edited{' '}
                  {formatDistanceToNow(new Date(selectedGuest.updatedAt), {
                    addSuffix: true,
                  })}
                </span>
              ) : (
                'Please fill out the form below to add a new guest'
              )}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-6">
            <GuestForm
              eventId={eventId}
              guest={selectedGuest}
              onSuccess={() => handleDrawerClose(false)}
              onCancel={() => handleDrawerClose(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
