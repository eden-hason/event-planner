'use client';

import { useState, useEffect } from 'react';
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="m-3 flex h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-clip rounded-xl border-0 p-0 data-[state=closed]:duration-200 data-[state=open]:duration-200 data-[state=open]:slide-in-from-right-5 data-[state=closed]:slide-out-to-right-10 sm:max-w-[920px]">
        <SheetHeader className="border-b px-6 py-5">
          <SheetDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Manage Members
          </SheetDescription>
          <SheetTitle className="text-xl">
            {`'${group?.name}' Group`}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Assign guests to this group for easier management
          </p>
        </SheetHeader>

        {/* Main content area */}
        <div className="flex flex-1 flex-row gap-4 overflow-hidden p-4 min-h-0 bg-muted/30">
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
              <IconArrowRight size={20} />
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
              <IconArrowLeft size={20} />
            </Button>
          </div>

          <GuestListCard
            title="Guests in Group"
            guests={localInGroup}
            countLabel="Members"
            onSelectionChange={setSelectedInGroup}
          />
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t px-6 py-4 sm:flex-row">
          <span className="text-muted-foreground text-sm">
            {totalSelected > 0 && `${totalSelected} guests selected to move`}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
