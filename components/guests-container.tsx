'use client';

import { useState } from 'react';
import { GuestSearch } from './guest-search';
import { GuestsTable } from './guests-table';
import { Guest } from '@/lib/dal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { AddGuestForm } from './add-guest-form';

interface GuestsContainerProps {
  guests: Guest[];
  eventId: string;
}

export function GuestsContainer({ guests, eventId }: GuestsContainerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header with search and add button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 flex-1 max-w-sm">
          <GuestSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Guest</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Guest</DialogTitle>
              <DialogDescription>
                Please fill out the form below to add a new guest.
              </DialogDescription>
            </DialogHeader>

            <AddGuestForm
              eventId={eventId}
              onSuccess={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Guests table */}
      <GuestsTable guests={guests} searchTerm={searchTerm} />
    </div>
  );
}
