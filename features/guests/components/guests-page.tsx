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
import { Badge } from '@/components/ui/badge';
import { IconClock, IconPlus, IconTrash, IconUsers } from '@tabler/icons-react';
import { GuestWithGroupApp, GroupWithGuestsApp } from '../schemas';
import { useFeatureHeader } from '@/components/feature-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  GroupsDirectory,
  CreateGroupDialog,
  GroupIcon,
} from '@/features/guests/components/groups';
import { upsertGroup, UpsertGroupState } from '../actions/groups';
import { deleteGuest } from '@/features/guests/actions';

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestWithGroupApp | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create group action with toast
  const createGroupActionWithToast = async (
    _prevState: UpsertGroupState | null,
    params: { formData: FormData },
  ): Promise<UpsertGroupState | null> => {
    const groupName = params.formData.get('name') as string;

    const promise = upsertGroup(eventId, params.formData).then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Failed to create group.');
      }
      return result;
    });

    toast.promise(promise, {
      loading: `Creating ${groupName}...`,
      success: (data) => {
        return data.message || 'Group created successfully.';
      },
      error: (err) => {
        return err instanceof Error
          ? err.message
          : 'Failed to create group. Please try again.';
      },
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

    handleDrawerClose(false); // Close the sheet optimistically

    const promise = deleteGuest(guestId).then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete guest.');
      }
      return result;
    });

    toast.promise(promise, {
      loading: `Deleting ${guestName}...`,
      success: (data) => data.message || 'Guest deleted successfully.',
      error: (err) =>
        err instanceof Error ? err.message : 'Failed to delete guest.',
    });
  };

  const guestsHeaderAction = useMemo(
    () => (
      <Button onClick={handleAddGuest}>
        <IconPlus size={16} />
        Add Guest
      </Button>
    ),
    [handleAddGuest],
  );

  const groupHeaderAction = useMemo(
    () => (
      <Button onClick={handleOpenGroupDialog}>
        <IconPlus size={16} />
        Add Group
      </Button>
    ),
    [],
  );

  const { setHeader } = useFeatureHeader({
    title: 'Guests',
    description: 'Manage your event guests',
    action: guestsHeaderAction,
  });

  const handleTabsChange = useCallback(
    (value: string) => {
      setHeader({
        title: 'Guests',
        description: 'Manage your event guests',
        action: value === 'guests' ? guestsHeaderAction : groupHeaderAction,
      });
    },
    [setHeader, guestsHeaderAction, groupHeaderAction],
  );

  const rsvpStatus = selectedGuest?.rsvpStatus || 'pending';
  const guestGroup = selectedGuest?.group;

  return (
    <>
      <GuestStats guests={guests} />
      <Tabs defaultValue="guests" onValueChange={handleTabsChange} className="mt-6">
        <TabsList className="border-border mb-4 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="guests"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            All Guests
          </TabsTrigger>
          <TabsTrigger
            value="groups"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Groups
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

      {/* Create group dialog */}
      <CreateGroupDialog
        open={isGroupDialogOpen}
        onOpenChange={setIsGroupDialogOpen}
        onCreateGroup={handleCreateGroup}
      />

      {/* Guest form sheet */}
      <Sheet open={isDrawerOpen} onOpenChange={handleDrawerClose}>
        <SheetContent
          className="m-3 flex h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-clip rounded-xl border-0 p-0 data-[state=closed]:duration-200 data-[state=open]:duration-200 data-[state=open]:slide-in-from-right-5 data-[state=closed]:slide-out-to-right-10 sm:max-w-[520px]"
          onOpenAutoFocus={(e) => {
            if (selectedGuest) e.preventDefault();
          }}
        >
          <SheetHeader className="border-b px-6 py-5">
            <SheetDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {selectedGuest ? 'Edit Guest' : 'Add New Guest'}
            </SheetDescription>
            <SheetTitle className="text-xl">
              {selectedGuest ? selectedGuest.name : 'New Guest'}
            </SheetTitle>
            {selectedGuest ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <IconClock size={12} />
                Last edited{' '}
                {formatDistanceToNow(new Date(selectedGuest.updatedAt), {
                  addSuffix: true,
                })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Fill out the form below to add a new guest.
              </p>
            )}
          </SheetHeader>

          {/* Status badges — edit mode only */}
          {selectedGuest && (
            <div className="border-b px-6 py-3 space-y-2">
              {/* RSVP badge — full row, single line with attribution */}
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${RSVP_BADGE_STYLES[rsvpStatus]}`}
              >
                <span
                  className={`size-1.5 rounded-full shrink-0 ${RSVP_DOT_STYLES[rsvpStatus]}`}
                />
                {rsvpStatus.charAt(0).toUpperCase() + rsvpStatus.slice(1)}
                {selectedGuest.rsvpChangedAt && (
                  <>
                    <span className="w-px h-3 bg-current opacity-25 shrink-0" />
                    <span className="font-normal opacity-60">
                      {selectedGuest.rsvpChangeSource === 'guest'
                        ? `via guest · ${format(new Date(selectedGuest.rsvpChangedAt), 'MMM d · HH:mm')}`
                        : `via ${selectedGuest.rsvpChangedBy === currentUserId ? 'you' : (selectedGuest.rsvpChangedByName ?? 'organizer')} · ${format(new Date(selectedGuest.rsvpChangedAt), 'MMM d · HH:mm')}`
                      }
                    </span>
                  </>
                )}
              </span>
              {/* Group + people badges */}
              <div className="flex gap-2 flex-wrap">
                {guestGroup && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 gap-1.5"
                  >
                    <GroupIcon iconName={guestGroup.icon} size="sm" />
                    {guestGroup.name}
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                  <IconUsers size={12} />
                  {selectedGuest.amount}{' '}
                  {selectedGuest.amount === 1 ? 'person' : 'people'}
                </Badge>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-6 bg-muted/30">
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
                  Delete Guest
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => handleDrawerClose(false)}>
                Cancel
              </Button>
              <Button type="submit" form="guest-form" disabled={isSubmitting}>
                {selectedGuest ? 'Update Guest' : 'Add Guest'}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
