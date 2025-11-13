'use client';

import { useState } from 'react';
import { GuestSearch } from './guest-search';
import { GuestsTable } from './guests-table';
import { GuestsDashboard } from './guests-dashboard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GuestForm } from '@/components/guest-form';
import { GuestApp } from '@/lib/schemas/guest.schema';

interface GuestsContainerProps {
  guests: GuestApp[];
  eventId: string;
}

export function GuestsContainer({ guests, eventId }: GuestsContainerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  return (
    <div className="space-y-4">
      {/* Header with search and buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 flex-1 max-w-sm">
          <GuestSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </div>

        <div className="flex items-center space-x-2">
          {/* Add Guest Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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

              <GuestForm
                eventId={eventId}
                onSuccess={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Guests table */}
      <GuestsTable guests={guests} searchTerm={searchTerm} eventId={eventId} />
    </div>
  );
}
