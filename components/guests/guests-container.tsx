'use client';

import {
  useState,
  useActionState,
  startTransition,
  useRef,
  useEffect,
} from 'react';
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
import { deleteGuest, type DeleteGuestState } from '@/app/actions/guests';
import { toast } from 'sonner';

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

  const deletingGuestRef = useRef<string | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const [deleteState, deleteAction, isDeleting] = useActionState(
    async (prevState: DeleteGuestState | null, guestId: string) => {
      const result = await deleteGuest(guestId);
      return result;
    },
    null,
  );

  // Show loading toast when deletion starts
  useEffect(() => {
    if (isDeleting && deletingGuestRef.current && !toastIdRef.current) {
      const guestName = deletingGuestRef.current;
      toastIdRef.current = toast.loading(`Deleting ${guestName}...`);
    }
  }, [isDeleting]);

  // Show success/error toast when deletion completes
  useEffect(() => {
    if (!isDeleting && deleteState && toastIdRef.current) {
      if (deleteState.success) {
        toast.success(deleteState.message || 'Guest deleted successfully.', {
          id: toastIdRef.current,
        });
      } else {
        toast.error(deleteState.message || 'Failed to delete guest.', {
          id: toastIdRef.current,
        });
      }
      toastIdRef.current = null;
      deletingGuestRef.current = null;
    }
  }, [isDeleting, deleteState]);

  const handleSelectGuest = (id: string) => {
    const guest = guests.find((guest) => guest.id === id);
    setSelectedGuest(guest || null);
    setIsDrawerOpen(true);
  };

  const handleDeleteGuest = (guest: GuestApp) => {
    deletingGuestRef.current = guest.name;
    startTransition(() => {
      deleteAction(guest.id);
    });
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
        onDeleteGuest={handleDeleteGuest}
        onAddGuest={handleAddGuestClick}
        onUploadFile={() => {
          // TODO: Implement file upload
          toast.info('File upload coming soon!');
        }}
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
