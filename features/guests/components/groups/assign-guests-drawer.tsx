'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { GroupWithGuestsApp, GuestApp } from '../../schemas';
import { GuestListCard } from './guest-list-card';
import { updateGroupMembers } from '../../actions/groups';

interface AssignGuestsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupWithGuestsApp | null;
  availableGuests: GuestApp[];
  eventId: string;
}

export function AssignGuestsDrawer({
  open,
  onOpenChange,
  group,
  availableGuests,
  eventId,
}: AssignGuestsDrawerProps) {
  const [selectedAvailable, setSelectedAvailable] = useState<GuestApp[]>([]);
  const [selectedInGroup, setSelectedInGroup] = useState<GuestApp[]>([]);

  // Local state for the lists (to allow moving before saving)
  const [localAvailable, setLocalAvailable] = useState<GuestApp[]>([]);
  const [localInGroup, setLocalInGroup] = useState<GuestApp[]>([]);

  // Initialize local lists when drawer opens or data changes
  useEffect(() => {
    if (open) {
      setLocalAvailable(availableGuests);
      setLocalInGroup(group?.guests ?? []);
      setSelectedAvailable([]);
      setSelectedInGroup([]);
    }
  }, [open, availableGuests, group?.guests]);

  const totalSelected = selectedAvailable.length + selectedInGroup.length;

  const handleMoveToGroup = () => {
    if (selectedAvailable.length === 0) return;

    setLocalInGroup([...localInGroup, ...selectedAvailable]);
    setLocalAvailable(
      localAvailable.filter(
        (g) => !selectedAvailable.some((s) => s.id === g.id),
      ),
    );
  };

  const handleMoveToAvailable = () => {
    if (selectedInGroup.length === 0) return;

    setLocalAvailable([...localAvailable, ...selectedInGroup]);
    setLocalInGroup(
      localInGroup.filter((g) => !selectedInGroup.some((s) => s.id === g.id)),
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedAvailable([]);
    setSelectedInGroup([]);
  };

  const handleSave = () => {
    if (!group) return;

    // Close drawer immediately
    handleClose();

    const memberGuestIds = localInGroup.map((g) => g.id);
    const previousMemberIds = (group.guests ?? []).map((g) => g.id);

    const promise = updateGroupMembers(
      eventId,
      group.id,
      memberGuestIds,
      previousMemberIds,
    ).then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Failed to update group members.');
      }
      return result;
    });

    toast.promise(promise, {
      loading: `Updating ${group.name} members...`,
      success: (data) => data.message || 'Group members updated successfully.',
      error: (err) =>
        err instanceof Error
          ? err.message
          : 'Failed to update group members. Please try again.',
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="!w-auto !max-w-none">
        <div className="bg-muted/50 flex h-full flex-col">
          <DrawerHeader className="bg-background border-b">
            <DrawerTitle className="text-xl">
              {`Manage '${group?.name}' Members`}
            </DrawerTitle>
            <DrawerDescription>
              Assign guests to this group for easier management
            </DrawerDescription>
          </DrawerHeader>

          {/* Main content area */}
          <div className="flex flex-1 flex-row gap-4 overflow-y-auto p-4">
            <GuestListCard
              title="Available Guests"
              guests={localAvailable}
              countLabel="Guests"
              onSelectionChange={setSelectedAvailable}
            />

            {/* Arrow buttons */}
            <div className="flex flex-col items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="icon"
                onClick={handleMoveToGroup}
                disabled={selectedAvailable.length === 0}
                className={`h-10 w-10 ${
                  selectedAvailable.length > 0
                    ? 'bg-primary/15 text-primary hover:bg-primary/25'
                    : ''
                }`}
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleMoveToAvailable}
                disabled={selectedInGroup.length === 0}
                className={`h-10 w-10 ${
                  selectedInGroup.length > 0
                    ? 'bg-primary/15 text-primary hover:bg-primary/25'
                    : ''
                }`}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>

            <GuestListCard
              title="Guests in Group"
              guests={localInGroup}
              countLabel="Members"
              onSelectionChange={setSelectedInGroup}
            />
          </div>

          <DrawerFooter className="bg-background flex-row items-center justify-between border-t">
            <span className="text-muted-foreground text-sm">
              {totalSelected > 0 && `${totalSelected} guests selected to move`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
