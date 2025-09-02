'use client';

import { useState } from 'react';
import { GuestSearch } from './guest-search';
import { GuestsTable } from './guests-table';
import { GuestsDashboard } from './guests-dashboard';
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
import { Separator } from './ui/separator';
import { AddGuestForm } from './add-guest-form';
import { ImportGuestsForm } from './import-guests-form';
import { Upload } from 'lucide-react';

interface GuestsContainerProps {
  guests: Guest[];
  eventId: string;
}

export function GuestsContainer({ guests, eventId }: GuestsContainerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <GuestsDashboard guests={guests} />
      </div>

      <Separator />

      {/* Header with search and buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 flex-1 max-w-sm">
          <GuestSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </div>

        <div className="flex items-center space-x-2">
          {/* Import CSV Button */}
          <Dialog
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-1" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Guests from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to import multiple guests at once. The file
                  should have columns: name, phone, group, rsvpStatus, amount,
                  notes
                </DialogDescription>
              </DialogHeader>

              <ImportGuestsForm
                eventId={eventId}
                onSuccess={() => setIsImportDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

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

              <AddGuestForm
                eventId={eventId}
                onSuccess={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Guests table */}
      <GuestsTable guests={guests} searchTerm={searchTerm} />
    </div>
  );
}
