'use client';

import { useState, useActionState, startTransition, useRef } from 'react';
import { GuestSearch } from './guest-search';
import { GuestsTable } from '@/features/guests/components/table';
import { GroupFilter } from '@/features/guests/components/filters';
import { ImportGuestsDialog } from '@/features/guests/components/groups';
import { GuestWithGroupApp, GroupInfo } from '@/features/guests/schemas';
import { useGuestFilters, useDynamicPageSize } from '@/features/guests/hooks';
import { deleteGuest, type DeleteGuestState } from '@/features/guests/actions';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GuestDirectoryProps {
  guests: GuestWithGroupApp[];
  groups: GroupInfo[];
  eventId: string;
  existingPhones: Set<string>;
  onSelectGuest: (guest: GuestWithGroupApp | null) => void;
}

export function GuestDirectory({
  guests,
  groups,
  eventId,
  existingPhones,
  onSelectGuest,
}: GuestDirectoryProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { pageSize, isCalculated } = useDynamicPageSize({
    containerRef: tableContainerRef,
  });
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

  const handleAddGuestClick = () => {
    onSelectGuest(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <GuestSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <GroupFilter
            groups={groups}
            selectedGroupIds={selectedGroupIds}
            onGroupToggle={handleGroupToggle}
            onSelectAll={handleSelectAllGroups}
            isAllSelected={isAllSelected}
          />
        </div>
      </CardHeader>
      <CardContent ref={tableContainerRef}>
        {isCalculated ? (
          <GuestsTable
            guests={guests}
            searchTerm={searchTerm}
            groupFilter={selectedGroupIds}
            onSelectGuest={handleSelectGuest}
            onDeleteGuest={handleDeleteGuest}
            onAddGuest={handleAddGuestClick}
            pageSize={pageSize}
          />
        ) : null}
      </CardContent>

      <ImportGuestsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        eventId={eventId}
        existingPhones={existingPhones}
      />
    </Card>
  );
}
