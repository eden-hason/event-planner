'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useActionState,
  startTransition,
} from 'react';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { setSearchParams } from '@/lib/shallow-navigation';
import { GuestsDesktop } from './desktop/guests-desktop';
import { Button } from '@/components/ui/button';
import { IconPlus } from '@tabler/icons-react';
import { GuestWithGroupApp, GroupWithGuestsApp, GroupSide } from '../schemas';
import type { TableOption } from '@/features/seating';
import { useFeatureHeader } from '@/components/feature-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  GroupsDirectory,
  CreateGroupDialog,
} from '@/features/guests/components/groups';
import {
  GroupsMobile,
  AssignGuestsScreen,
  CreateGroupSheet,
  type AssignTarget,
} from '@/features/guests/components/groups/mobile';
import { upsertGroup, UpsertGroupState, UpsertGroupErrorCode } from '../actions/groups';
import { GuestsMobile, AddGuestSourceSheet, type SelectionHeader } from './mobile';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePublishedHeight } from '@/hooks/use-published-height';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { RecordPackageProvider, type GuestPackageView } from '@/features/billing';

/** The query parameter that addresses the open guest drawer. */
const GUEST_PARAM = 'guest';
/** `?guest=new` opens the drawer on an empty add-guest form. */
const NEW_GUEST = 'new';

interface GuestsPageProps {
  guests: GuestWithGroupApp[];
  eventId: string;
  eventName?: string;
  groups: GroupWithGuestsApp[];
  existingPhones: Map<string, string>;
  showDietary?: boolean;
  tables?: TableOption[];
  messagedGuestIds?: string[];
  /** The Record Package, counts only; null when the event has none. */
  recordPackage?: GuestPackageView | null;
}

// The base `TabsTrigger` ships a border on every side (for the desktop pill),
// a `data-[state=active]:bg-background`, and a `shadow-sm` - all of which
// have to be zeroed out explicitly, not just left unset, or they show through
// as a boxed rectangle around the active tab instead of the design's plain
// underline. `border-b-primary` (not `border-primary`) is what keeps the
// active color off the top/left/right edges.
const UNDERLINE_TAB_TRIGGER_CLASS =
  'h-10 rounded-none border-0 border-b-2 border-transparent bg-transparent text-[15px] font-semibold text-muted-foreground shadow-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none';

export function GuestsPage({
  guests,
  eventId,
  eventName,
  groups,
  existingPhones,
  showDietary = false,
  tables = [],
  messagedGuestIds = [],
  recordPackage = null,
}: GuestsPageProps) {
  const t = useTranslations('guests');
  const locale = useLocale();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = useState(false);
  const tabsRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [assignSheetOpen, setAssignSheetOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupWithGuestsApp | null>(null);
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);
  const unassignedGuests = useMemo(
    () => guests.filter((g) => !g.groupId),
    [guests],
  );

  const goToImportRoute = () => router.push(`/app/${eventId}/guests/import`);
  // `?source=drive` tells the wizard to open straight into the Drive picker
  // instead of the plain upload screen - see `GuestImportFlow`.
  const goToImportRouteViaDrive = () =>
    router.push(`/app/${eventId}/guests/import?source=drive`);

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
    // Read everything needed afterwards before the FormData goes to the action.
    const groupName = (formData.get('name') as string) || '';
    const groupSide = (formData.get('side') as GroupSide | null) || null;

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
          setAssignTarget({
            id: result.groupId,
            name: groupName,
            side: groupSide,
            guests: [],
          });
          setAssignSheetOpen(true);
        }
      })
      .catch(() => {});
  };

  const handleOpenGroupDialog = () => {
    setEditingGroup(null);
    setIsGroupDialogOpen(true);
  };

  const handleEditGroup = (group: GroupWithGuestsApp) => {
    setEditingGroup(group);
    setIsGroupDialogOpen(true);
  };

  const handleUpdateGroup = (formData: FormData) => {
    const groupName = (formData.get('name') as string) || '';
    const promise = upsertGroup(eventId, formData).then((result) => {
      if (!result.success) {
        throw new Error(groupCreateErrorMessage(result.errorCode));
      }
      return result;
    });
    toast.promise(promise, {
      loading: t('groups.mobile.updatingGroup', { name: groupName }),
      success: () => t('groups.mobile.groupUpdated'),
      error: (err) =>
        err instanceof Error ? err.message : t('groups.mobile.groupUpdateFailed'),
    });
  };

  const handleOpenAssign = (group: GroupWithGuestsApp) => {
    setAssignTarget({ id: group.id, name: group.name, side: group.side, guests: group.guests });
    setAssignSheetOpen(true);
  };

  // The guest drawer lives in `?guest=<id>` (or `?guest=new` to add one)
  // rather than in component state, like the open Schedule does: the back
  // button closes it instead of leaving the page, and a guest can be linked
  // to. The update is shallow - every guest is already in `guests`.
  const searchParams = useSearchParams();
  const guestParam = searchParams.get(GUEST_PARAM);
  // An id that no longer resolves (a deleted guest, a stale link) leaves the
  // drawer closed rather than opening an empty edit form.
  const openGuest =
    guestParam && guestParam !== NEW_GUEST
      ? (guests.find((guest) => guest.id === guestParam) ?? null)
      : null;
  const isDrawerOpen = guestParam === NEW_GUEST || openGuest !== null;

  // What the drawer shows. It follows the URL while the drawer is open and
  // holds its last value once it closes, so the sheet slides out still showing
  // the guest instead of flipping to the empty "new guest" form.
  const [selectedGuest, setSelectedGuest] = useState(openGuest);
  if (isDrawerOpen && openGuest !== selectedGuest) {
    setSelectedGuest(openGuest);
  }

  const openGuestDrawer = (id: string, mode: 'push' | 'replace' = 'push') => {
    setSearchParams((params) => params.set(GUEST_PARAM, id), mode);
  };

  const handleAddGuest = () => openGuestDrawer(NEW_GUEST);

  // Home's Featured Actions deep-link here: `?tab=groups` lands on the groups
  // tab, `?add=1` opens the same add-guest entry point as the header button
  // (the source sheet on a phone, the drawer on desktop) once, then drops the
  // flag so a refresh or a back navigation does not open it again. It waits
  // for mount, which is when `isMobile` is first known.
  useEffect(() => {
    if (!hasMounted || searchParams.get('add') !== '1') return;
    if (isMobile) setSourceSheetOpen(true);
    // One replace, so the flag never survives in history for back to replay.
    setSearchParams((params) => {
      params.delete('add');
      if (!isMobile) params.set(GUEST_PARAM, NEW_GUEST);
    }, 'replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, hasMounted]);

  const handleDrawerClose = (open: boolean) => {
    if (!open) setSearchParams((params) => params.delete(GUEST_PARAM));
  };

  // Mobile routes the header button through a source sheet (single guest vs.
  // upload a file) rather than straight into the guest form - see
  // `AddGuestSourceSheet`. That sheet is also now the only way into import on
  // mobile: it replaces the entry that used to live in the export dropdown
  // (see `GuestsMobile`), so bulk import isn't hidden behind a download icon
  // anymore, at the cost of one extra tap before adding a single guest.
  const guestsHeaderAction = useMemo(
    () => (
      <Button
        onClick={() => setSourceSheetOpen(true)}
        className="h-9 gap-[5px] rounded-[10px] px-[13px] font-bold"
      >
        <IconPlus size={16} stroke={2.4} />
        {t('list.mobile.add')}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // While the phone list is selecting, the header is the selection's: its
  // count, an X that ends it, and "select all" where the add button was.
  const [selectionHeader, setSelectionHeader] =
    useState<SelectionHeader | null>(null);

  const groupHeaderAction = useMemo(
    () => (
      <Button onClick={handleOpenGroupDialog}>
        <IconPlus size={16} />
        {t('groups.mobile.newGroupButton')}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [activeTab, setActiveTab] = useState<'guests' | 'groups'>(() =>
    searchParams.get('tab') === 'groups' ? 'groups' : 'guests',
  );

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
  const selection =
    isMobile && activeTab === 'guests' ? selectionHeader : null;
  const headerConfig = selection
    ? {
        title:
          selection.count > 0
            ? t('list.bar.selected', { count: selection.count })
            : t('list.mobile.selecting'),
        back: {
          label: t('list.bar.clear'),
          onClick: selection.onClear,
          icon: 'close' as const,
        },
        subtitle:
          selection.hidden > 0 ? (
            <button
              type="button"
              onClick={selection.onShowHidden}
              className="underline underline-offset-[3px]"
            >
              {t('list.bar.hidden', { count: selection.hidden })}
            </button>
          ) : undefined,
        action: (
          <Button
            variant="ghost"
            onClick={selection.onSelectAll}
            className="text-primary hover:text-primary px-2"
          >
            {t('list.mobile.selectAll')}
          </Button>
        ),
      }
    : {
        title,
        subtitle: t('headerSubtitle', {
          total: guests.length,
          groupCount: groups.length,
        }),
        action: isMobile ? headerAction : undefined,
        // Desktop keeps the title and tabs in view while the list scrolls, with
        // the toolbar and the table header stacked under them (D13).
        sticky: !isMobile,
      };
  const { setHeader } = useFeatureHeader(headerConfig);
  useEffect(() => {
    setHeader(headerConfig);
    // Keyed on what the header shows, not on `headerConfig`, which is a new
    // object every render: an identity-keyed effect would set state in a loop.
    // The counts feed the subtitle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, isMobile, activeTab, guests.length, groups.length, setHeader, selection]);

  usePublishedHeight(tabsRowRef, '--guest-tabs-h', hasMounted && !isMobile);

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
    <RecordPackageProvider view={recordPackage} eventName={eventName}>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'guests' | 'groups')}
        dir={locale === 'he' ? 'rtl' : 'ltr'}
      >
        <div
          ref={tabsRowRef}
          className={cn(
            'mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
            // Pinned under the page title on desktop; full-bleed so the list
            // never shows past its edges while it scrolls beneath.
            !isMobile &&
              'bg-app-shell sticky top-[var(--page-header-h,0px)] z-20 -mx-6 px-6',
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
              // Underline tabs at every width, per the Guests designs: no pill,
              // no icons, the active tab reads through its border.
              'h-10 gap-0 rounded-none bg-transparent p-0',
              isMobile ? 'w-full' : 'w-fit gap-6',
            )}
          >
            <TabsTrigger value="guests" className={cn(UNDERLINE_TAB_TRIGGER_CLASS, isMobile ? 'flex-1' : 'flex-none px-0.5 text-[14.5px]')}>
              {t('tabGuests')}
            </TabsTrigger>
            <TabsTrigger value="groups" className={cn(UNDERLINE_TAB_TRIGGER_CLASS, isMobile ? 'flex-1' : 'flex-none px-0.5 text-[14.5px]')}>
              {t('tabGroups')}
            </TabsTrigger>
          </TabsList>
          {/* Desktop's add-guest button lives in the list's own toolbar. */}
          {!isMobile && activeTab === 'groups' && (
            <div className="flex justify-end">{headerAction}</div>
          )}
        </div>
        <TabsContent value="guests" className="mt-0">
          {isMobile ? (
            <GuestsMobile
              guests={guests}
              groups={groups}
              eventId={eventId}
              eventName={eventName}
              messagedGuestIds={messagedGuestIds}
              showDietary={showDietary}
              tables={tables}
              drawer={{
                open: isDrawerOpen,
                guest: selectedGuest,
                onOpenChange: handleDrawerClose,
              }}
              onOpenGuest={(guest) => openGuestDrawer(guest.id)}
              onAddGuest={handleAddGuest}
              onImportFile={goToImportRoute}
              onImportDrive={goToImportRouteViaDrive}
              onSelectionHeader={setSelectionHeader}
            />
          ) : (
            <GuestsDesktop
              guests={guests}
              groups={groups}
              eventId={eventId}
              eventName={eventName}
              existingPhones={existingPhones}
              messagedGuestIds={messagedGuestIds}
              showDietary={showDietary}
              tables={tables}
              drawer={{
                open: isDrawerOpen,
                guest: selectedGuest,
                onOpenChange: handleDrawerClose,
              }}
              onOpenGuest={(guest) => openGuestDrawer(guest.id)}
              onAddGuest={handleAddGuest}
              onImportDrive={goToImportRouteViaDrive}
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
              onEditGroup={handleEditGroup}
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
          unassignedCount={unassignedGuests.length}
          group={editingGroup}
          onUpdateGroup={handleUpdateGroup}
        />
      ) : (
        <CreateGroupDialog
          open={isGroupDialogOpen}
          onOpenChange={setIsGroupDialogOpen}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {isMobile && (
        <AssignGuestsScreen
          open={assignSheetOpen}
          onOpenChange={setAssignSheetOpen}
          group={assignTarget}
          availableGuests={unassignedGuests}
          totalRecords={guests.length}
          eventId={eventId}
        />
      )}

      {isMobile && (
        <AddGuestSourceSheet
          open={sourceSheetOpen}
          onOpenChange={setSourceSheetOpen}
          onSelectSingleGuest={handleAddGuest}
          onSelectUploadFile={goToImportRoute}
          onSelectGoogleDrive={goToImportRouteViaDrive}
        />
      )}

    </RecordPackageProvider>
  );
}
