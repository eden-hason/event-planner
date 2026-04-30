'use client';

import {
  useCallback,
  useMemo,
  useState,
  useActionState,
  startTransition,
} from 'react';
import { format, formatDistanceToNow } from 'date-fns';
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
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { IconClock, IconPlus, IconTrash, IconUserPlus, IconUsers, IconUsersGroup } from '@tabler/icons-react';
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
  existingPhones: Set<string>;
  showDietary?: boolean;
  currentUserId?: string | null;
}

const RSVP_BADGE_STYLES: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200' ,
  declined: 'bg-red-100 text-red-700 border-red-200',
};

const RSVP_DOT_STYLES: Record<string, string> = {
  confirmed: 'bg-green-500',
  pending: 'bg-yellow-500',
  declined: 'bg-red-500',
};

export function GuestsPage({
  guests,
  eventId,
  groups,
  existingPhones,
  showDietary = false,
  currentUserId = null,
}: GuestsPageProps) {
  const t = useTranslations('guests');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestWithGroupApp | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

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
      <GuestStats
        guests={guests}
        selectedStatuses={selectedStatuses}
        onStatClick={handleStatCardClick}
      />
      <Tabs defaultValue="guests" onValueChange={handleTabsChange} className="mt-6" dir={locale === 'he' ? 'rtl' : 'ltr'}>
        <TabsList className="border-border mb-4 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="guests"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <IconUsers size={16} />
            {t('tabGuests')}
          </TabsTrigger>
          <TabsTrigger
            value="groups"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <IconUsersGroup size={16} />
            {t('tabGroups')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="guests">
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
          <SheetHeader className="border-b px-6 py-5">
            <SheetDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {selectedGuest ? t('sheet.editGuest') : t('sheet.addNewGuest')}
            </SheetDescription>
            <SheetTitle className="text-xl">
              {selectedGuest ? selectedGuest.name : t('sheet.newGuest')}
            </SheetTitle>
            {selectedGuest ? (
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${RSVP_BADGE_STYLES[rsvpStatus]}`}
              >
                <span
                  className={`size-1.5 rounded-full shrink-0 ${RSVP_DOT_STYLES[rsvpStatus]}`}
                />
                {t(`rsvp.${rsvpStatus}` as 'rsvp.pending' | 'rsvp.confirmed' | 'rsvp.declined')}
              </span>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('sheet.addGuestHint')}
              </p>
            )}
          </SheetHeader>

          {selectedGuest && (
            <div className="border-b px-6 py-4 space-y-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <IconClock size={12} />
                {t('sheet.lastEdited')}{' '}
                {formatDistanceToNow(new Date(selectedGuest.updatedAt), {
                  addSuffix: true,
                })}
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <IconUsers size={14} className="shrink-0 text-muted-foreground" />
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">{t('sheet.people')}</span>
                  <span className="text-foreground">
                    {selectedGuest.amount}{' '}
                    {selectedGuest.amount === 1 ? t('form.person') : t('form.people')}
                  </span>
                </div>
                {guestGroup && (
                  <div className="flex items-center gap-3 text-sm">
                    <GroupIcon iconName={guestGroup.icon} size="sm" className="shrink-0 text-muted-foreground" />
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">{t('sheet.group')}</span>
                    <span className="text-foreground">{guestGroup.name}</span>
                  </div>
                )}
                {selectedGuest.rsvpChangedAt && (
                  <div className="flex items-center gap-3 text-sm">
                    <IconClock size={14} className="shrink-0 text-muted-foreground" />
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">{t('sheet.updated')}</span>
                    <span className="text-foreground">
                      {selectedGuest.rsvpChangeSource === 'guest'
                        ? `${t('sheet.viaGuest')} · ${format(new Date(selectedGuest.rsvpChangedAt), 'MMM d · HH:mm')}`
                        : `${selectedGuest.rsvpChangedBy === currentUserId ? t('sheet.viaYou') : (selectedGuest.rsvpChangedByName ?? t('sheet.viaOrganizer'))} · ${format(new Date(selectedGuest.rsvpChangedAt), 'MMM d · HH:mm')}`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

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
