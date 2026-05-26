'use client';

import {
  useCallback,
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
import { IconClock, IconPlus, IconProgressHelp, IconTrash, IconUserPlus, IconUsers, IconUsersGroup } from '@tabler/icons-react';
import { GuestWithGroupApp, GroupWithGuestsApp } from '../schemas';
import { useFeatureHeader } from '@/components/feature-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  GroupsDirectory,
  CreateGroupDialog,
  GroupIcon,
} from '@/features/guests/components/groups';
import { upsertGroup, UpsertGroupState, UpsertGroupErrorCode } from '../actions/groups';
import { deleteGuest } from '@/features/guests/actions';
import { GuestActionsSection } from './guest-actions-section';

interface GuestsPageProps {
  guests: GuestWithGroupApp[];
  eventId: string;
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

  const { setHeader } = useFeatureHeader({
    title: t('title'),
    description: t('description'),
    action: guestsHeaderAction,
  });

  const handleTabsChange = useCallback(
    (value: string) => {
      setHeader({
        title: t('title'),
        description: t('description'),
        action: value === 'guests' ? guestsHeaderAction : groupHeaderAction,
      });
    },
    [setHeader, guestsHeaderAction, groupHeaderAction],
  );

  const rsvpStatus = selectedGuest?.rsvpStatus || 'pending';
  const guestGroup = selectedGuest?.group;

  return (
    <>
      <Tabs defaultValue="guests" onValueChange={handleTabsChange} dir={locale === 'he' ? 'rtl' : 'ltr'}>
        <TabsList className="border-border mb-6 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="guests"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 text-sm shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <IconUsers size={18} />
            {t('tabGuests')}
          </TabsTrigger>
          <TabsTrigger
            value="groups"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 text-sm shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <IconUsersGroup size={18} />
            {t('tabGroups')}
          </TabsTrigger>
        </TabsList>
        <GuestStats
          guests={guests}
          selectedStatuses={selectedStatuses}
          onStatClick={handleStatCardClick}
        />
        <TabsContent value="guests" className="mt-6">
          <GuestDirectory
            guests={guests}
            groups={groups}
            eventId={eventId}
            existingPhones={existingPhones}
            onSelectGuest={handleSelectGuest}
            showDietary={showDietary}
            selectedStatuses={selectedStatuses}
            onStatusToggle={handleStatusToggle}
          />
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

      <Sheet open={isDrawerOpen} onOpenChange={handleDrawerClose}>
        <SheetContent
          className="m-3 flex h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-clip rounded-xl border-0 p-0 data-[state=closed]:duration-200 data-[state=open]:duration-200 data-[state=open]:slide-in-from-right-5 data-[state=closed]:slide-out-to-right-10 sm:max-w-[520px]"
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
                  {/* Status */}
                  <span className="inline-flex items-stretch w-fit rounded-full border bg-muted/40 text-sm overflow-hidden">
                    <span className="px-2.5 py-1 flex items-center gap-1.5 text-muted-foreground">
                      <IconProgressHelp size={12} className="shrink-0" />
                      {t('form.rsvpStatus')}
                    </span>
                    <span className="w-px bg-border" />
                    <span className="px-2.5 py-1 flex items-center gap-1.5 text-foreground">
                      <span className={`size-1.5 rounded-full shrink-0 ${RSVP_DOT_STYLES[rsvpStatus]}`} />
                      {t(`rsvp.${rsvpStatus}` as 'rsvp.pending' | 'rsvp.confirmed' | 'rsvp.declined')}
                    </span>
                  </span>

                  {/* Guests */}
                  <span className="inline-flex items-stretch w-fit rounded-full border bg-muted/40 text-sm overflow-hidden">
                    <span className="px-2.5 py-1 flex items-center gap-1.5 text-muted-foreground">
                      <IconUsers size={12} className="shrink-0" />
                      {t('sheet.people')}
                    </span>
                    <span className="w-px bg-border" />
                    <span className="px-2.5 py-1 text-foreground">
                      {selectedGuest.amount}{' '}
                      {selectedGuest.amount === 1 ? t('form.person') : t('form.people')}
                    </span>
                  </span>

                  {/* Group */}
                  {guestGroup && (
                    <span className="inline-flex items-stretch w-fit rounded-full border bg-muted/40 text-sm overflow-hidden">
                      <span className="px-2.5 py-1 flex items-center gap-1.5 text-muted-foreground">
                        <GroupIcon iconName={guestGroup.icon} size="sm" className="shrink-0" />
                        {t('form.group')}
                      </span>
                      <span className="w-px bg-border" />
                      <span className="px-2.5 py-1 text-foreground">{guestGroup.name}</span>
                    </span>
                  )}

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
              onSuccess={() => handleDrawerClose(false)}
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
