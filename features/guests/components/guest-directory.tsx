'use client';

import { useActionState, startTransition } from 'react';
import { GuestSearch } from './guest-search';
import { GuestsTable } from '@/features/guests/components/table';
import { GroupFilter } from '@/features/guests/components/filters';
import { GuestWithGroupApp, GroupInfo } from '@/features/guests/schemas';
import { useGuestFilters } from '@/features/guests/hooks';
import {
  deleteGuest,
  type DeleteGuestState,
  sendWhatsAppMessage,
  SendWhatsAppMessageState,
} from '@/features/guests/actions';
import { toast } from 'sonner';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface GuestDirectoryProps {
  guests: GuestWithGroupApp[];
  groups: GroupInfo[];
  onSelectGuest: (guest: GuestWithGroupApp | null) => void;
}

export function GuestDirectory({
  guests,
  groups,
  onSelectGuest,
}: GuestDirectoryProps) {
  const {
    searchTerm,
    setSearchTerm,
    selectedGroupIds,
    handleGroupToggle,
    handleSelectAllGroups,
    isAllSelected,
  } = useGuestFilters(groups);

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

  const sendWhatsAppActionWithToast = async (
    prevState: SendWhatsAppMessageState | null,
    params: { phoneNumber: string; message: string },
  ): Promise<SendWhatsAppMessageState | null> => {
    const promise = sendWhatsAppMessage(
      params.phoneNumber,
      params.message,
    ).then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Failed to send WhatsApp message.');
      }
      return result;
    });

    toast.promise(promise, {
      loading: 'Sending WhatsApp message...',
      success: (data) => {
        return data.messageSid
          ? `WhatsApp message sent successfully! Message ID: ${data.messageSid}`
          : data.message || 'WhatsApp message sent successfully!';
      },
      error: (err) => {
        return err instanceof Error
          ? err.message
          : 'Failed to send WhatsApp message. Please try again.';
      },
    });

    try {
      return await promise;
    } catch {
      return null;
    }
  };

  const [, whatsAppAction, isSendingWhatsApp] = useActionState(
    sendWhatsAppActionWithToast,
    null,
  );

  const handleSelectGuest = (id: string) => {
    const guest = guests.find((guest) => guest.id === id);
    onSelectGuest(guest || null);
  };

  const handleDeleteGuest = (guest: GuestWithGroupApp) => {
    startTransition(() => {
      deleteAction({
        guestId: guest.id,
        guestName: guest.name,
      });
    });
  };

  const handleSendWhatsApp = (guest: GuestWithGroupApp) => {
    if (!guest.phone || guest.phone.trim().length === 0) {
      toast.error('Cannot send WhatsApp message', {
        description: 'Guest does not have a phone number.',
      });
      return;
    }

    const message = `Kululu Events - Coming Soon! 🎉`;

    startTransition(() => {
      whatsAppAction({
        phoneNumber: guest.phone?.trim() || '',
        message,
      });
    });
  };

  const handleAddGuestClick = () => {
    onSelectGuest(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <GuestSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        <GroupFilter
          groups={groups}
          selectedGroupIds={selectedGroupIds}
          onGroupToggle={handleGroupToggle}
          onSelectAll={handleSelectAllGroups}
          isAllSelected={isAllSelected}
        />
      </CardHeader>
      <CardContent>
        <GuestsTable
          guests={guests}
          searchTerm={searchTerm}
          groupFilter={selectedGroupIds}
          onSelectGuest={handleSelectGuest}
          onDeleteGuest={handleDeleteGuest}
          onSendWhatsApp={handleSendWhatsApp}
          isSendingWhatsApp={isSendingWhatsApp}
          onAddGuest={handleAddGuestClick}
          onUploadFile={() => {
            // TODO: Implement file upload
            toast.info('File upload coming soon!');
          }}
        />
      </CardContent>
    </Card>
  );
}
