'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useActionState,
  startTransition,
} from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import { GuestDirectory } from './guest-directory';
import { GuestForm } from './guest-form';
import { GuestStats } from './guest-stats';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  IconClock,
  IconDotsVertical,
  IconFileSpreadsheet,
  IconPlus,
  IconTrash,
  IconUpload,
  IconUserPlus,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import { GuestWithGroupApp, GroupWithGuestsApp } from '../schemas';
import { useFeatureHeader } from '@/components/feature-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  GroupsDirectory,
  CreateGroupDialog,
  ImportGuestsDialog,
} from '@/features/guests/components/groups';
import { upsertGroup, UpsertGroupState, UpsertGroupErrorCode } from '../actions/groups';
import { deleteGuest, upsertGuest } from '@/features/guests/actions';
import { exportGuestsToIplan, type IplanScope } from '@/features/guests/utils';
import { GuestActionsSection } from './guest-actions-section';
import { GuestsMobile } from './mobile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface GuestsPageProps {
  guests: GuestWithGroupApp[];
  eventId: string;
  eventName?: string;
  groups: GroupWithGuestsApp[];
  existingPhones: Map<string, string>;
  showDietary?: boolean;
  currentUserId?: string | null;
  initialInvitedGuestIds?: string[];
  capacity?: number | null;
}


const RSVP_DOT_STYLES: Record<string, string> = {
  confirmed: 'bg-green-500',
  pending: 'bg-yellow-500',
  declined: 'bg-red-500',
};

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-blue-100 text-blue-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function GuestsPage({
  guests,
  eventId,
  eventName,
  groups,
  existingPhones,
  showDietary = false,
  currentUserId = null,
  initialInvitedGuestIds = [],
  capacity = null,
}: GuestsPageProps) {
  const t = useTranslations('guests');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const nonOfflineCount = guests
    .filter((g) => !g.isOfflineRsvp)
    .reduce((sum, g) => sum + g.amount, 0);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestWithGroupApp | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [formIsOfflineRsvp, setFormIsOfflineRsvp] = useState(false);
  const [recentlyUpdatedGuestId, setRecentlyUpdatedGuestId] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const handleStatCardClick = (status: string | null) => {
    if (status === null) {
      setSelectedStatuses([]);
    } else {
      setSelectedStatuses((prev) =>
        prev.length === 1 && prev[0] === status ? [] : [status],
      );
    }
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const createGroupActionWithToast = async (
    _prevState: UpsertGroupState | null,
    params: { formData: FormData },
  ): Promise<UpsertGroupState | null> => {
    const groupName = params.formData.get('name') as string;

    const errorMessages: Record<UpsertGroupErrorCode, string> = {
      GROUP_NAME_TAKEN: t('toast.groupNameTaken'),
      UNKNOWN: t('toast.groupCreateFailed'),
    };

    const promise = upsertGroup(eventId, params.formData).then((result) => {
      if (!result.success) {
        throw new Error(
          result.errorCode
            ? errorMessages[result.errorCode]
            : t('toast.groupCreateFailed'),
        );
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.creatingGroup', { name: groupName }),
      success: () => t('toast.groupCreated'),
      error: (err) =>
        err instanceof Error ? err.message : t('toast.groupCreateFailed'),
    });

    try {
      return await promise;
    } catch {
      return null;
    }
  };

  const [, createGroupAction] = useActionState(
    createGroupActionWithToast,
    null,
  );

  const handleCreateGroup = (formData: FormData) => {
    startTransition(() => {
      createGroupAction({ formData });
    });
  };

  const handleOpenGroupDialog = () => {
    setIsGroupDialogOpen(true);
  };

  const handleAddGuest = () => {
    setSelectedGuest(null);
    setFormIsOfflineRsvp(false);
    setIsDrawerOpen(true);
  };

  const handleSelectGuest = (guest: GuestWithGroupApp | null) => {
    setSelectedGuest(guest);
    setFormIsOfflineRsvp(guest?.isOfflineRsvp ?? false);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = (open: boolean) => {
    setIsDrawerOpen(open);
  };

  const handleDeleteGuest = () => {
    if (!selectedGuest) return;
    const guestName = selectedGuest.name;
    const guestId = selectedGuest.id;

    handleDrawerClose(false);

    const promise = deleteGuest(guestId).then((result) => {
      if (!result.success) {
        throw new Error(result.message || t('toast.guestDeleteFailed'));
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.deletingGuest', { name: guestName }),
      success: (data) => data.message || t('toast.guestDeleted'),
      error: (err) =>
        err instanceof Error ? err.message : t('toast.guestDeleteFailed'),
    });
  };

  const handleDeleteGuestById = (guest: GuestWithGroupApp) => {
    const promise = deleteGuest(guest.id).then((result) => {
      if (!result.success) {
        throw new Error(result.message || t('toast.guestDeleteFailed'));
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.deletingGuest', { name: guest.name }),
      success: (data) => data.message || t('toast.guestDeleted'),
      error: (err) =>
        err instanceof Error ? err.message : t('toast.guestDeleteFailed'),
    });
  };

  const handleMarkConfirmed = (guest: GuestWithGroupApp) => {
    if (guest.rsvpStatus === 'confirmed') return;

    const formData = new FormData();
    formData.append('id', guest.id);
    formData.append('rsvpStatus', 'confirmed');

    const promise = upsertGuest(eventId, formData).then((result) => {
      if (!result.success) {
        throw new Error(result.message || t('toast.markConfirmedFailed'));
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.markingConfirmed', { name: guest.name }),
      success: () => t('toast.markedConfirmed', { name: guest.name }),
      error: (err) =>
        err instanceof Error ? err.message : t('toast.markConfirmedFailed'),
    });
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

  const guestsHeaderAction = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button onClick={handleAddGuest}>
          <IconUserPlus size={16} />
          {t('addGuest')}
        </Button>
        {isMobile && (
          <DropdownMenu dir={locale === 'he' ? 'rtl' : 'ltr'}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <span className="sr-only">{t('table.openMenu')}</span>
                <IconDotsVertical size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="min-h-11 gap-3 text-base [&_svg:not([class*='size-'])]:size-5"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <IconUpload size={20} />
                {t('directory.importCsv')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-11 gap-3 text-base [&_svg:not([class*='size-'])]:size-5"
                onClick={() => handleExport('confirmed')}
              >
                <IconFileSpreadsheet size={20} />
                {t('directory.exportConfirmed')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-11 gap-3 text-base [&_svg:not([class*='size-'])]:size-5"
                onClick={() => handleExport('all')}
              >
                <IconFileSpreadsheet size={20} />
                {t('directory.exportAll')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    ),
    [handleAddGuest, isMobile, locale],
  );

  const groupHeaderAction = useMemo(
    () => (
      <Button onClick={handleOpenGroupDialog}>
        <IconPlus size={16} />
        {t('addGroup')}
      </Button>
    ),
    [],
  );

  const headerDescription = isMobile ? undefined : t('description');

  const { setHeader } = useFeatureHeader({
    title: t('title'),
    description: headerDescription,
    action: guestsHeaderAction,
  });

  const handleTabsChange = useCallback(
    (value: string) => {
      setHeader({
        title: t('title'),
        description: headerDescription,
        action: value === 'guests' ? guestsHeaderAction : groupHeaderAction,
      });
    },
    [setHeader, guestsHeaderAction, groupHeaderAction, headerDescription],
  );

  const rsvpStatus = selectedGuest?.rsvpStatus || 'pending';
  const guestGroup = selectedGuest?.group;

  if (!hasMounted) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="guests" onValueChange={handleTabsChange} dir={locale === 'he' ? 'rtl' : 'ltr'}>
        <TabsList
          className={cn(
            'border-border mb-4 h-10 w-full rounded-none border-b bg-transparent p-0',
            isMobile ? 'justify-stretch gap-0' : 'justify-start gap-4',
          )}
        >
          <TabsTrigger
            value="guests"
            className={cn(
              'data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full rounded-none border-none bg-transparent px-1 pb-3 text-sm shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none',
              isMobile ? 'flex-1' : 'flex-none',
            )}
          >
            <IconUsers size={18} />
            {t('tabGuests')}
          </TabsTrigger>
          <TabsTrigger
            value="groups"
            className={cn(
              'data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full rounded-none border-none bg-transparent px-1 pb-3 text-sm shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none',
              isMobile ? 'flex-1' : 'flex-none',
            )}
          >
            <IconUsersGroup size={18} />
            {t('tabGroups')}
          </TabsTrigger>
        </TabsList>
        {!isMobile && (
          <GuestStats
            guests={guests}
            selectedStatuses={selectedStatuses}
            onStatClick={handleStatCardClick}
          />
        )}
        <TabsContent value="guests" className="mt-0">
          {isMobile ? (
            <GuestsMobile
              guests={guests}
              groups={groups}
              onSelectGuest={handleSelectGuest}
              onDeleteGuest={handleDeleteGuestById}
              onMarkConfirmed={handleMarkConfirmed}
              onUploadFile={() => setIsImportDialogOpen(true)}
              selectedStatuses={selectedStatuses}
              onStatusClick={handleStatCardClick}
            />
          ) : (
            <GuestDirectory
              guests={guests}
              groups={groups}
              eventId={eventId}
              eventName={eventName}
              existingPhones={existingPhones}
              onSelectGuest={handleSelectGuest}
              showDietary={showDietary}
              selectedStatuses={selectedStatuses}
              onStatusToggle={handleStatusToggle}
              recentlyUpdatedGuestId={recentlyUpdatedGuestId}
            />
          )}
        </TabsContent>
        <TabsContent value="groups">
          <GroupsDirectory
            eventId={eventId}
            groups={groups}
            guests={guests}
            onAddGroup={handleOpenGroupDialog}
          />
        </TabsContent>
      </Tabs>

      <CreateGroupDialog
        open={isGroupDialogOpen}
        onOpenChange={setIsGroupDialogOpen}
        onCreateGroup={handleCreateGroup}
      />

      {isMobile && (
        <ImportGuestsDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          eventId={eventId}
          existingPhones={existingPhones}
        />
      )}

      <Sheet open={isDrawerOpen} onOpenChange={handleDrawerClose}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className={cn(
            'flex flex-col gap-0 overflow-clip border-0 p-0 data-[state=closed]:duration-200 data-[state=open]:duration-200',
            isMobile
              ? 'h-[92dvh] rounded-t-xl'
              : 'm-3 h-[calc(100dvh-1.5rem)] rounded-xl data-[state=open]:slide-in-from-right-5 data-[state=closed]:slide-out-to-right-10 sm:max-w-[520px]',
          )}
          onOpenAutoFocus={(e) => {
            if (selectedGuest) e.preventDefault();
          }}
        >
          <SheetHeader className="border-b px-6 pt-5 pb-4">
            {selectedGuest ? (
              <div className="flex flex-col gap-0">
                {/* Avatar + name row */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`size-10 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold ${getAvatarColor(selectedGuest.name)}`}
                  >
                    {selectedGuest.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-[19px] font-semibold leading-tight truncate">
                      {selectedGuest.name}
                    </SheetTitle>
                    {selectedGuest.isOfflineRsvp && (
                      <span className="inline-flex w-fit items-center rounded-full border border-dashed px-2 py-0.5 text-[11px] font-medium text-muted-foreground mt-1">
                        {t('rsvp.offlineRsvp')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Labeled data badges */}
                <div className="flex flex-col gap-1.5 items-start">
                  {/* RSVP Updated */}
                  {selectedGuest.rsvpChangedAt && (
                    <span className="inline-flex items-stretch w-fit rounded-full border bg-muted/40 text-sm overflow-hidden">
                      <span className="px-2.5 py-1 flex items-center gap-1.5 text-muted-foreground">
                        <IconClock size={12} className="shrink-0" />
                        {t('sheet.updated')}
                      </span>
                      <span className="w-px bg-border" />
                      <span className="px-2.5 py-1 text-muted-foreground">
                        {selectedGuest.rsvpChangeSource === 'guest'
                          ? `${t('sheet.viaGuest')} · ${format(new Date(selectedGuest.rsvpChangedAt), 'd/M/yy · HH:mm')}`
                          : selectedGuest.rsvpChangeSource === 'admin_call'
                            ? `${t('sheet.viaAdmin')} · ${format(new Date(selectedGuest.rsvpChangedAt), 'd/M/yy · HH:mm')}`
                            : `${selectedGuest.rsvpChangedBy === currentUserId ? t('sheet.viaYou') : (selectedGuest.rsvpChangedByName ?? t('sheet.viaOrganizer'))} · ${format(new Date(selectedGuest.rsvpChangedAt), 'd/M/yy · HH:mm')}`}
                      </span>
                    </span>
                  )}
                </div>

              </div>
            ) : (
              <>
                <SheetTitle className="text-xl">{t('sheet.newGuest')}</SheetTitle>
                <p className="text-xs text-muted-foreground">{t('sheet.addGuestHint')}</p>
              </>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 bg-muted/30 flex flex-col gap-4">
            <GuestForm
              formId="guest-form"
              eventId={eventId}
              guest={selectedGuest}
              groups={groups}
              onSuccess={() => {
                if (selectedGuest) {
                  setRecentlyUpdatedGuestId(selectedGuest.id);
                  setTimeout(() => setRecentlyUpdatedGuestId(null), 3400);
                }
                handleDrawerClose(false);
              }}
              onCancel={() => handleDrawerClose(false)}
              hideActions
              onPendingChange={setIsSubmitting}
              showDietary={showDietary}
              hasReceivedInitialInvitation={
                selectedGuest
                  ? initialInvitedGuestIds.includes(selectedGuest.id)
                  : false
              }
              nonOfflineCount={nonOfflineCount}
              capacity={capacity}
              onOfflineRsvpChange={setFormIsOfflineRsvp}
            />
            {selectedGuest && !selectedGuest.isOfflineRsvp && !formIsOfflineRsvp && (
              <GuestActionsSection invitationToken={selectedGuest.invitationToken} />
            )}
          </div>

          <SheetFooter className="flex-row justify-between border-t px-6 py-4 sm:flex-row">
            <div>
              {selectedGuest && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDeleteGuest}
                >
                  <IconTrash size={16} />
                  {t('sheet.deleteGuest')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => handleDrawerClose(false)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" form="guest-form" disabled={isSubmitting}>
                {selectedGuest ? t('sheet.updateGuest') : t('addGuest')}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
