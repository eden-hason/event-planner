'use client';

import {
  useCallback,
  useMemo,
  useState,
  useActionState,
  startTransition,
} from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { GuestDirectory } from './guest-directory';
import { GuestForm } from './guest-form';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CalendarSync, PlusIcon } from 'lucide-react';
import { GuestWithGroupApp, GroupWithGuestsApp } from '../schemas';
import { useFeatureHeader } from '@/components/feature-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  GroupsDirectory,
  CreateGroupDialog,
} from '@/features/guests/components/groups';
import { upsertGroup, UpsertGroupState } from '../actions/groups';

interface GuestsPageProps {
  guests: GuestWithGroupApp[];
  eventId: string;
  groups: GroupWithGuestsApp[];
  existingPhones: Set<string>;
}

export function GuestsPage({
  guests,
  eventId,
  groups,
  existingPhones,
}: GuestsPageProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestWithGroupApp | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create group action with toast
  const createGroupActionWithToast = async (
    prevState: UpsertGroupState | null,
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
    if (!open) {
      setSelectedGuest(null);
    }
  };

  const guestsHeaderAction = useMemo(
    () => (
      <Button onClick={handleAddGuest}>
        <PlusIcon className="size-4" />
        Add Guest
      </Button>
    ),
    [handleAddGuest],
  );

  const groupHeaderAction = useMemo(
    () => (
      <Button onClick={handleOpenGroupDialog}>
        <PlusIcon className="size-4" />
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

  return (
    <>
      <Tabs defaultValue="guests" onValueChange={handleTabsChange}>
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
          onOpenAutoFocus={(e) => { if (selectedGuest) e.preventDefault(); }}
        >
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>
              {selectedGuest ? `Edit ${selectedGuest.name}` : 'Add New Guest'}
            </SheetTitle>
            <SheetDescription>
              {selectedGuest ? (
                <span className="flex items-center gap-2">
                  <CalendarSync className="size-4" />
                  Last edited{' '}
                  {formatDistanceToNow(new Date(selectedGuest.updatedAt), {
                    addSuffix: true,
                  })}
                </span>
              ) : (
                'Fill out the form below to add a new guest.'
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <GuestForm
              formId="guest-form"
              eventId={eventId}
              guest={selectedGuest}
              groups={groups}
              onSuccess={() => handleDrawerClose(false)}
              onCancel={() => handleDrawerClose(false)}
              hideActions
              onPendingChange={setIsSubmitting}
            />
          </div>

          <SheetFooter className="flex-row justify-between border-t px-6 py-4 sm:flex-row">
            <Button variant="ghost" onClick={() => handleDrawerClose(false)}>
              Cancel
            </Button>
            <Button type="submit" form="guest-form" disabled={isSubmitting}>
              {selectedGuest ? 'Update Guest' : 'Add Guest'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
