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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
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
}

export function GuestsPage({ guests, eventId, groups }: GuestsPageProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestWithGroupApp | null>(
    null,
  );

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
            onSelectGuest={handleSelectGuest}
          />
        </TabsContent>
        <TabsContent value="groups">
          <GroupsDirectory
            eventId={eventId}
            groups={groups}
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

      {/* Guest form drawer */}
      <Drawer
        direction="right"
        open={isDrawerOpen}
        onOpenChange={handleDrawerClose}
      >
        <DrawerContent className="!max-w-[600px]">
          <DrawerHeader>
            <DrawerTitle>
              {selectedGuest ? `Edit ${selectedGuest.name}` : 'Add New Guest'}
            </DrawerTitle>
            <DrawerDescription>
              {selectedGuest ? (
                <span className="flex items-center gap-2">
                  <CalendarSync className="size-4" />
                  Last edited{' '}
                  {formatDistanceToNow(new Date(selectedGuest.updatedAt), {
                    addSuffix: true,
                  })}
                </span>
              ) : (
                'Please fill out the form below to add a new guest'
              )}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-6">
            <GuestForm
              eventId={eventId}
              guest={selectedGuest}
              groups={groups}
              onSuccess={() => handleDrawerClose(false)}
              onCancel={() => handleDrawerClose(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
