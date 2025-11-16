'use client';

import { useState, useActionState, startTransition } from 'react';
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
import {
  deleteGuest,
  type DeleteGuestState,
  sendSMS,
  type SendSMSState,
} from '@/app/actions/guests';
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

  // Delete guest action with toast
  const deleteActionWithToast = async (
    prevState: DeleteGuestState | null,
    params: { guestId: string; guestName: string },
  ): Promise<DeleteGuestState | null> => {
    const promise = deleteGuest(params.guestId).then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete guest.');
      }
      return result;
    });

    toast.promise(promise, {
      loading: `Deleting ${params.guestName}...`,
      success: (data) => {
        return data.message || 'Guest deleted successfully.';
      },
      error: (err) => {
        return err instanceof Error
          ? err.message
          : 'Failed to delete guest. Please try again.';
      },
    });

    try {
      return await promise;
    } catch {
      return null;
    }
  };

  const [, deleteAction] = useActionState(deleteActionWithToast, null);

  // Send SMS action with toast
  const sendSMSActionWithToast = async (
    prevState: SendSMSState | null,
    params: { phoneNumber: string; message: string },
  ): Promise<SendSMSState | null> => {
    const promise = sendSMS(params.phoneNumber, params.message).then(
      (result) => {
        if (!result.success) {
          throw new Error(result.message || 'Failed to send SMS.');
        }
        return result;
      },
    );

    toast.promise(promise, {
      loading: 'Sending SMS...',
      success: (data) => {
        return data.messageSid
          ? `SMS sent successfully! Message ID: ${data.messageSid}`
          : data.message || 'SMS sent successfully!';
      },
      error: (err) => {
        return err instanceof Error
          ? err.message
          : 'Failed to send SMS. Please try again.';
      },
    });

    try {
      return await promise;
    } catch {
      return null;
    }
  };

  const [, smsAction, isSendingSMS] = useActionState(
    sendSMSActionWithToast,
    null,
  );

  const handleSelectGuest = (id: string) => {
    const guest = guests.find((guest) => guest.id === id);
    setSelectedGuest(guest || null);
    setIsDrawerOpen(true);
  };

  const handleDeleteGuest = (guest: GuestApp) => {
    startTransition(() => {
      deleteAction({
        guestId: guest.id,
        guestName: guest.name,
      });
    });
  };

  const handleSendSMS = (guest: GuestApp) => {
    if (!guest.phone || guest.phone.trim().length === 0) {
      toast.error('Cannot send SMS', {
        description: 'Guest does not have a phone number.',
      });
      return;
    }

    const message = `Kululu Events - Coming Soon! 🎉`;

    startTransition(() => {
      smsAction({
        phoneNumber: guest.phone.trim(),
        message,
      });
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
        onSendSMS={handleSendSMS}
        isSendingSMS={isSendingSMS}
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
