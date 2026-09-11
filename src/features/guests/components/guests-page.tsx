'use client';

import {
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
  IconClock,
  IconPlus,
  IconTrash,
  IconUserPlus,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import { GuestWithGroupApp, GroupWithGuestsApp } from '../schemas';
import type { TableOption } from '@/features/seating';
import { useFeatureHeader } from '@/components/feature-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  GroupsDirectory,
  CreateGroupDialog,
  ImportGuestsDialog,
} from '@/features/guests/components/groups';
import {
  GroupsMobile,
  AssignGuestsSheet,
  CreateGroupSheet,
  type AssignTarget,
} from '@/features/guests/components/groups/mobile';
import { upsertGroup, UpsertGroupState, UpsertGroupErrorCode } from '../actions/groups';
import { deleteGuest, upsertGuest } from '@/features/guests/actions';
import { exportGuestsToIplan, type IplanScope } from '@/features/guests/utils';
import { GuestActionsSection } from './guest-actions-section';
import { GuestsMobile } from './mobile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { avatarTintFor } from '@/lib/avatar-tint';

interface GuestsPageProps {
  guests: GuestWithGroupApp[];
  eventId: string;
  eventName?: string;
  groups: GroupWithGuestsApp[];
  existingPhones: Map<string, string>;
  showDietary?: boolean;
  tables?: TableOption[];
  currentUserId?: string | null;
}

// The base `TabsTrigger` ships a border on every side (for the desktop pill),
// a `data-[state=active]:bg-background`, and a `shadow-sm` - all of which
// have to be zeroed out explicitly, not just left unset, or they show through
// as a boxed rectangle around the active tab instead of the design's plain
// underline. `border-b-primary` (not `border-primary`) is what keeps the
// active color off the top/left/right edges.
const MOBILE_TAB_TRIGGER_CLASS =
  'h-10 flex-1 rounded-none border-0 border-b-2 border-transparent bg-transparent text-[15px] font-semibold text-muted-foreground shadow-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none';

export function GuestsPage({
  guests,
  eventId,
  eventName,
  groups,
  existingPhones,
  showDietary = false,
  tables = [],
  currentUserId = null,
}: GuestsPageProps) {
  const t = useTranslations('guests');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [assignSheetOpen, setAssignSheetOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<GuestWithGroupApp | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
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

  const groupCreateErrorMessage = (errorCode?: UpsertGroupErrorCode) => {
    const errorMessages: Record<UpsertGroupErrorCode, string> = {
      GROUP_NAME_TAKEN: t('toast.groupNameTaken'),
      UNKNOWN: t('toast.groupCreateFailed'),
    };
    return errorCode ? errorMessages[errorCode] : t('toast.groupCreateFailed');
  };

  const createGroupActionWithToast = async (
    _prevState: UpsertGroupState | null,
    params: { formData: FormData },
  ): Promise<UpsertGroupState | null> => {
    const groupName = params.formData.get('name') as string;

    const promise = upsertGroup(eventId, params.formData).then((result) => {
      if (!result.success) {
        throw new Error(groupCreateErrorMessage(result.errorCode));
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

  // Mobile's "create & assign guests" flow needs the new group's id right
  // away to open the assign sheet, so it calls the server action directly
  // instead of going through `createGroupAction` - the revalidated `groups`
  // prop wouldn't be ready in time anyway.
  const handleCreateGroupAndAssign = (formData: FormData) => {
    const groupName = (formData.get('name') as string) || '';

    const promise = upsertGroup(eventId, formData).then((result) => {
      if (!result.success) {
        throw new Error(groupCreateErrorMessage(result.errorCode));
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.creatingGroup', { name: groupName }),
      success: () => t('toast.groupCreated'),
      error: (err) =>
        err instanceof Error ? err.message : t('toast.groupCreateFailed'),
    });

    promise
      .then((result) => {
        if (result.groupId) {
          setAssignTarget({ id: result.groupId, name: groupName, guests: [] });
          setAssignSheetOpen(true);
        }
      })
      .catch(() => {});
  };

  const handleOpenGroupDialog = () => {
    setIsGroupDialogOpen(true);
  };

  const handleOpenAssign = (group: GroupWithGuestsApp) => {
    setAssignTarget({ id: group.id, name: group.name, guests: group.guests });
    setAssignSheetOpen(true);
  };

  const handleAddGuest = () => {
    setSelectedGuest(null);
    setIsDrawerOpen(true);
  };

  const handleSelectGuest = (guest: GuestWithGroupApp | null) => {
    setSelectedGuest(guest);
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
      success: () => t('toast.guestDeleted'),
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
      success: () => t('toast.guestDeleted'),
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
      <Button onClick={handleAddGuest}>
        <IconUserPlus size={16} />
        {t('addGuest')}
      </Button>
    ),
    [handleAddGuest],
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

  const [activeTab, setActiveTab] = useState<'guests' | 'groups'>('guests');

  /*
   * On a phone the tab's action goes into `PageCard`'s chrome row beside the
   * title: stacked above the tab list it cost a whole extra row, and the row it
   * shared with the tabs broke onto two lines. Desktop keeps it inline with the
   * tabs, where the width is there for both.
   *
   * `useFeatureHeader` only re-runs on a title change, so the action is pushed
   * through `setHeader` as well - it changes with the active tab.
   */
  const title = t('title');
  const headerAction =
    activeTab === 'guests' ? guestsHeaderAction : groupHeaderAction;
  const headerConfig = { title, action: isMobile ? headerAction : undefined };
  const { setHeader } = useFeatureHeader(headerConfig);
  useEffect(() => {
    setHeader(headerConfig);
    // Keyed on what the action actually depends on, not on `headerConfig`:
    // `guestsHeaderAction` is rebuilt every render (its own deps include
    // handlers that are), so an identity-keyed effect would set state in a
    // loop. `guests`/`eventName` are here because the export items close over
    // them and would otherwise keep exporting a stale list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, isMobile, activeTab, guests, eventName, setHeader]);

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
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'guests' | 'groups')}
        dir={locale === 'he' ? 'rtl' : 'ltr'}
      >
        <div
          className={cn(
            'mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
            // On mobile the design keeps the tabs on the same white surface as
            // the title above, not the gray shell: bleed past `CardContent`'s
            // own inset and pull up through the Card's `gap-4` so the band
            // reads as one continuous header instead of two floating pieces.
            // No bottom padding of its own - the border sits flush against
            // the tabs themselves, exactly like the design's header block.
            isMobile && '-mx-4 -mt-4 border-b bg-card px-4',
          )}
        >
          <TabsList
            className={cn(
              'w-full sm:w-fit',
              // Mobile mirrors the design's full-width underline tabs, not
              // the pill switch desktop keeps: no background or icons, an
              // even split, and the active state reads through the border.
              isMobile &&
                'h-10 gap-0 rounded-none bg-transparent p-0',
            )}
          >
            <TabsTrigger value="guests" className={cn(isMobile && MOBILE_TAB_TRIGGER_CLASS)}>
              {!isMobile && <IconUsers size={16} />}
              {t('tabGuests')}
            </TabsTrigger>
            <TabsTrigger value="groups" className={cn(isMobile && MOBILE_TAB_TRIGGER_CLASS)}>
              {!isMobile && <IconUsersGroup size={16} />}
              {t('tabGroups')}
            </TabsTrigger>
          </TabsList>
          {!isMobile && <div className="flex justify-end">{headerAction}</div>}
        </div>
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
              onExport={handleExport}
              selectedStatuses={selectedStatuses}
              onStatusClick={handleStatCardClick}
              tables={tables}
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
              tables={tables}
              selectedStatuses={selectedStatuses}
              onStatusToggle={handleStatusToggle}
              recentlyUpdatedGuestId={recentlyUpdatedGuestId}
            />
          )}
        </TabsContent>
        <TabsContent value="groups">
          {isMobile ? (
            <GroupsMobile
              eventId={eventId}
              groups={groups}
              guests={guests}
              onAddGroup={handleOpenGroupDialog}
              onOpenAssign={handleOpenAssign}
            />
          ) : (
            <GroupsDirectory
              eventId={eventId}
              groups={groups}
              guests={guests}
              onAddGroup={handleOpenGroupDialog}
            />
          )}
        </TabsContent>
      </Tabs>

      {isMobile ? (
        <CreateGroupSheet
          open={isGroupDialogOpen}
          onOpenChange={setIsGroupDialogOpen}
          onCreateGroup={handleCreateGroup}
          onCreateAndAssign={handleCreateGroupAndAssign}
        />
      ) : (
        <CreateGroupDialog
          open={isGroupDialogOpen}
          onOpenChange={setIsGroupDialogOpen}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {isMobile && (
        <AssignGuestsSheet
          open={assignSheetOpen}
          onOpenChange={setAssignSheetOpen}
          group={assignTarget}
          availableGuests={guests.filter((g) => !g.groupId)}
          eventId={eventId}
        />
      )}

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
                    className={`size-10 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold ${avatarTintFor(selectedGuest.name)}`}
                  >
                    {selectedGuest.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-[19px] font-semibold leading-tight truncate">
                      {selectedGuest.name}
                    </SheetTitle>
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
              tables={tables}
            />
            {selectedGuest && (
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
