'use client';

import { useState, useActionState, startTransition, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { GuestSearch } from './guest-search';
import { GuestsTable } from '@/features/guests/components/table';
import { GroupFilter, RsvpStatusFilter } from '@/features/guests/components/filters';
import { ImportGuestsDialog } from '@/features/guests/components/groups';
import { ContactPickerDialog, type ContactInfo } from './contact-picker-dialog';
import { GuestWithGroupApp, GroupInfo } from '@/features/guests/schemas';
import { useGuestFilters, useDynamicPageSize } from '@/features/guests/hooks';
import { deleteGuest, type DeleteGuestState } from '@/features/guests/actions';
import { IconAddressBook, IconUpload } from '@tabler/icons-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ContactManager {
  select(props: string[], opts?: { multiple?: boolean }): Promise<ContactInfo[]>;
}

interface GuestDirectoryProps {
  guests: GuestWithGroupApp[];
  groups: GroupInfo[];
  eventId: string;
  existingPhones: Set<string>;
  onSelectGuest: (guest: GuestWithGroupApp | null) => void;
  showDietary?: boolean;
  selectedStatuses?: string[];
  onStatusToggle?: (status: string) => void;
}

export function GuestDirectory({
  guests,
  groups,
  eventId,
  existingPhones,
  onSelectGuest,
  showDietary = false,
  selectedStatuses: externalStatuses,
  onStatusToggle: externalStatusToggle,
}: GuestDirectoryProps) {
  const t = useTranslations('guests');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [pickedContacts, setPickedContacts] = useState<ContactInfo[]>([]);
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
    selectedStatuses: internalStatuses,
    handleStatusToggle: internalStatusToggle,
  } = useGuestFilters(groups);

  const selectedStatuses = externalStatuses ?? internalStatuses;
  const handleStatusToggle = externalStatusToggle ?? internalStatusToggle;

  const deleteActionWithToast = async (
    prevState: DeleteGuestState | null,
    params: { guestId: string; guestName: string },
  ): Promise<DeleteGuestState | null> => {
    const promise = deleteGuest(params.guestId).then((result) => {
      if (!result.success) {
        throw new Error(result.message || t('directory.guestDeleteFailed'));
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('directory.deletingGuest', { name: params.guestName }),
      success: (data) => data.message || t('directory.guestDeleted'),
      error: (err) =>
        err instanceof Error ? err.message : t('directory.guestDeleteFailed'),
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

  const handleImportFromContacts = async () => {
    const contacts = await (navigator as unknown as { contacts: ContactManager }).contacts
      .select(['name', 'tel'], { multiple: true });
    if (contacts.length > 0) {
      setPickedContacts(contacts);
      setContactDialogOpen(true);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GuestSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            className="gap-2"
          >
            <IconUpload size={16} />
            {t('directory.importCsv')}
          </Button>
          {'contacts' in navigator && (
            <Button
              variant="outline"
              onClick={handleImportFromContacts}
              className="gap-2"
            >
              <IconAddressBook size={16} />
              {t('directory.importFromContacts')}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RsvpStatusFilter
            selectedStatuses={selectedStatuses}
            onStatusToggle={handleStatusToggle}
          />
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
            statusFilter={selectedStatuses}
            onSelectGuest={handleSelectGuest}
            onDeleteGuest={handleDeleteGuest}
            onAddGuest={handleAddGuestClick}
            onUploadFile={() => setImportDialogOpen(true)}
            pageSize={pageSize}
            showDietary={showDietary}
          />
        ) : null}
      </CardContent>

      <ImportGuestsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        eventId={eventId}
        existingPhones={existingPhones}
      />

      <ContactPickerDialog
        rawContacts={pickedContacts}
        eventId={eventId}
        existingPhones={existingPhones}
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
      />
    </Card>
  );
}
