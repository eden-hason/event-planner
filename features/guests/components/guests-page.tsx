'use client';

import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { GuestDirectory } from './guest-directory';
import { GuestForm } from './guest-form';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { CalendarSync, PlusIcon } from 'lucide-react';
import { GuestApp } from '../schemas';
import { useFeatureHeader } from '@/components/feature-layout';

interface GuestsPageProps {
  guests: GuestApp[];
  eventId: string;
}

export function GuestsPage({ guests, eventId }: GuestsPageProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestApp | null>(null);

  const handleAddGuest = () => {
    setSelectedGuest(null);
    setIsDrawerOpen(true);
  };

  const handleSelectGuest = (guest: GuestApp | null) => {
    setSelectedGuest(guest);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) {
      setSelectedGuest(null);
    }
  };

  // Configure the feature header with title and action button
  const headerAction = useMemo(
    () => (
      <Button onClick={handleAddGuest}>
        <PlusIcon className="size-4" />
        Add Guest
      </Button>
    ),
    [],
  );

  useFeatureHeader({
    title: 'Guests',
    action: headerAction,
  });

  return (
    <>
      <GuestDirectory guests={guests} onSelectGuest={handleSelectGuest} />

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
    </>
  );
}
