'use client';

import * as React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateCollaboratorScope } from '../actions';
import { ScopePicker } from './scope-picker';
import type { CollaboratorApp } from '../schemas';
import type { GroupApp, GuestApp } from '@/features/guests/schemas';

interface EditScopeDrawerProps {
  collaborator: CollaboratorApp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupApp[];
  guests: GuestApp[];
  initialGroupIds: string[];
  initialGuestIds: string[];
}

export function EditScopeDrawer({
  collaborator,
  open,
  onOpenChange,
  groups,
  guests,
  initialGroupIds,
  initialGuestIds,
}: EditScopeDrawerProps) {
  const [selectedGroups, setSelectedGroups] =
    React.useState<string[]>(initialGroupIds);
  const [selectedGuests, setSelectedGuests] =
    React.useState<string[]>(initialGuestIds);
  const [isPending, setIsPending] = React.useState(false);

  // Sync when collaborator changes
  React.useEffect(() => {
    setSelectedGroups(initialGroupIds);
    setSelectedGuests(initialGuestIds);
  }, [initialGroupIds, initialGuestIds]);

  const handleSave = async () => {
    if (!collaborator) return;
    setIsPending(true);

    const formData = new FormData();
    formData.set('scopeGroups', JSON.stringify(selectedGroups));
    formData.set('scopeGuests', JSON.stringify(selectedGuests));

    try {
      const result = await updateCollaboratorScope(collaborator.id, formData);
      if (!result.success) {
        toast.error(result.message || 'Failed to update scope.');
        return;
      }
      toast.success('Scope updated.');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update scope.');
    } finally {
      setIsPending(false);
    }
  };

  if (!collaborator) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="fixed inset-y-0 right-0 w-full max-w-md rounded-none">
        <DrawerHeader>
          <DrawerTitle>Edit Scope — {collaborator.fullName}</DrawerTitle>
          <DrawerDescription>
            Choose which groups and guests this seating manager can view.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <ScopePicker
            groups={groups}
            guests={guests}
            selectedGroups={selectedGroups}
            selectedGuests={selectedGuests}
            onGroupsChange={setSelectedGroups}
            onGuestsChange={setSelectedGuests}
          />
        </div>
        <div className="border-t p-4">
          <Button
            onClick={handleSave}
            disabled={
              isPending ||
              (selectedGroups.length === 0 && selectedGuests.length === 0)
            }
            className="w-full"
          >
            {isPending ? 'Saving...' : 'Save Scope'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
