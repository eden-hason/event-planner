'use client';

import { useState, useActionState, startTransition, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { GuestSearch } from './guest-search';
import { GuestsTable } from '@/features/guests/components/table';
import {
  GroupFilter,
  RsvpStatusFilter,
  SideFilter,
} from '@/features/guests/components/filters';
import { ImportGuestsDialog } from '@/features/guests/components/groups';
import { GuestWithGroupApp, GroupInfo } from '@/features/guests/schemas';
import { useGuestFilters, useDynamicPageSize } from '@/features/guests/hooks';
import { deleteGuest, type DeleteGuestState } from '@/features/guests/actions';
import { exportGuestsToIplan, type IplanScope } from '@/features/guests/utils';
import { IconUpload, IconPhoneOff, IconFileSpreadsheet } from '@tabler/icons-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from '@/components/ui/item';
import { cn } from '@/lib/utils';

interface GuestDirectoryProps {
  guests: GuestWithGroupApp[];
  groups: GroupInfo[];
  eventId: string;
  eventName?: string;
  existingPhones: Map<string, string>;
  onSelectGuest: (guest: GuestWithGroupApp | null) => void;
  showDietary?: boolean;
  selectedStatuses?: string[];
  onStatusToggle?: (status: string) => void;
}

export function GuestDirectory({
  guests,
  groups,
  eventId,
  eventName,
  existingPhones,
  onSelectGuest,
  showDietary = false,
  selectedStatuses: externalStatuses,
  onStatusToggle: externalStatusToggle,
}: GuestDirectoryProps) {
  const t = useTranslations('guests');
  const isRTL = useLocale() === 'he';
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
    selectedStatuses: internalStatuses,
    handleStatusToggle: internalStatusToggle,
    selectedSides,
    handleSideToggle,
    handleSelectAllSides,
    isAllSidesSelected,
    noPhoneOnly,
    toggleNoPhoneOnly,
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

  const handleExport = (scope: IplanScope) => {
    const fileName = eventName ? `${eventName}-iplan.xls` : 'iplan-guests.xls';
    const promise = exportGuestsToIplan(guests, { scope, fileName });

    toast.promise(promise, {
      loading: t('directory.exportingIplan'),
      success: () => t('directory.exportIplanSuccess'),
      error: (err) =>
        err instanceof Error ? err.message : t('directory.exportFailed'),
    });
  };

  const isEmpty = guests.length === 0;

  return (
    <Card>
      {!isEmpty && (
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GuestSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(true)}
              className="gap-2"
            >
              <IconUpload size={16} />
              {t('directory.importCsv')}
            </Button>
            <DropdownMenu dir={isRTL ? 'rtl' : 'ltr'}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <IconFileSpreadsheet size={16} />
                  {t('directory.exportIplan')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem onClick={() => handleExport('confirmed')}>
                  <Item size="sm" className="p-0 gap-3">
                    <ItemMedia>
                      <span className="size-2.5 rounded-full bg-green-500" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{t('directory.exportConfirmed')}</ItemTitle>
                      <ItemDescription>{t('directory.exportConfirmedDesc')}</ItemDescription>
                    </ItemContent>
                  </Item>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('confirmedPending')}>
                  <Item size="sm" className="p-0 gap-3">
                    <ItemMedia>
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ background: 'linear-gradient(135deg, #22c55e 50%, #fb923c 50%)' }}
                      />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{t('directory.exportConfirmedPending')}</ItemTitle>
                      <ItemDescription>{t('directory.exportConfirmedPendingDesc')}</ItemDescription>
                    </ItemContent>
                  </Item>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('all')}>
                  <Item size="sm" className="p-0 gap-3">
                    <ItemMedia>
                      <span className="size-2.5 rounded-full bg-blue-500" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{t('directory.exportAll')}</ItemTitle>
                      <ItemDescription>{t('directory.exportAllDesc')}</ItemDescription>
                    </ItemContent>
                  </Item>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            <SideFilter
              selectedSides={selectedSides}
              onSideToggle={handleSideToggle}
              onSelectAll={handleSelectAllSides}
              isAllSelected={isAllSidesSelected}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={toggleNoPhoneOnly}
              className={cn('gap-2', noPhoneOnly && 'border-primary/50 bg-primary/8 text-primary font-medium hover:bg-primary/15 hover:text-primary')}
            >
              <IconPhoneOff size={16} />
              {t('filters.noPhone')}
            </Button>
          </div>
        </CardHeader>
      )}
      <CardContent ref={tableContainerRef}>
        {isCalculated ? (
          <GuestsTable
            guests={guests}
            searchTerm={searchTerm}
            groupFilter={selectedGroupIds}
            statusFilter={selectedStatuses}
            sideFilter={selectedSides}
            noPhoneOnly={noPhoneOnly}
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

    </Card>
  );
}
