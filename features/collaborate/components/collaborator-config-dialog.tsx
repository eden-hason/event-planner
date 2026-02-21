'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { IconCrown, IconArmchair2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { updateCollaboratorRole, updateCollaboratorScope } from '../actions';
import { ScopePicker } from './scope-picker';
import { ROLE_LABELS, type CollaboratorApp, type CollaboratorRole } from '../schemas';
import type { GroupApp, GuestApp } from '@/features/guests/schemas';

interface CollaboratorConfigDialogProps {
  collaborator: CollaboratorApp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupApp[];
  guests: GuestApp[];
  initialGroupIds: string[];
  initialGuestIds: string[];
}

const ROLE_OPTIONS: {
  value: CollaboratorRole;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'owner',
    label: ROLE_LABELS.owner,
    description: 'Full access to all event settings, guests, and collaborators.',
    icon: IconCrown,
  },
  {
    value: 'seating_manager',
    label: ROLE_LABELS.seating_manager,
    description: 'Can manage assigned guests and groups only.',
    icon: IconArmchair2,
  },
];

export function CollaboratorConfigDialog({
  collaborator,
  open,
  onOpenChange,
  groups,
  guests,
  initialGroupIds,
  initialGuestIds,
}: CollaboratorConfigDialogProps) {
  const [selectedRole, setSelectedRole] = React.useState<CollaboratorRole>(
    collaborator?.role ?? 'owner',
  );
  const [selectedGroups, setSelectedGroups] = React.useState<string[]>(initialGroupIds);
  const [selectedGuests, setSelectedGuests] = React.useState<string[]>(initialGuestIds);
  const [isPending, setIsPending] = React.useState(false);

  // Sync state when collaborator/initial data changes
  React.useEffect(() => {
    if (collaborator) {
      setSelectedRole(collaborator.role);
    }
    setSelectedGroups(initialGroupIds);
    setSelectedGuests(initialGuestIds);
  }, [collaborator, initialGroupIds, initialGuestIds]);

  const handleSave = async () => {
    if (!collaborator) return;
    setIsPending(true);

    try {
      const roleChanged = selectedRole !== collaborator.role;

      if (roleChanged) {
        // Build formData for scope if changing to seating_manager
        let formData: FormData | undefined;
        if (selectedRole === 'seating_manager') {
          if (selectedGroups.length === 0 && selectedGuests.length === 0) {
            toast.error('Seating managers need at least one group or guest assigned.');
            setIsPending(false);
            return;
          }
          formData = new FormData();
          formData.set('scopeGroups', JSON.stringify(selectedGroups));
          formData.set('scopeGuests', JSON.stringify(selectedGuests));
        }

        const result = await updateCollaboratorRole(
          collaborator.id,
          selectedRole,
          formData,
        );
        if (!result.success) {
          toast.error(result.message || 'Failed to update role.');
          setIsPending(false);
          return;
        }
        toast.success(result.message || 'Role updated.');
      } else if (selectedRole === 'seating_manager') {
        // Role didn't change, but scope may have
        if (selectedGroups.length === 0 && selectedGuests.length === 0) {
          toast.error('At least one group or guest is required.');
          setIsPending(false);
          return;
        }
        const formData = new FormData();
        formData.set('scopeGroups', JSON.stringify(selectedGroups));
        formData.set('scopeGuests', JSON.stringify(selectedGuests));

        const result = await updateCollaboratorScope(collaborator.id, formData);
        if (!result.success) {
          toast.error(result.message || 'Failed to update scope.');
          setIsPending(false);
          return;
        }
        toast.success(result.message || 'Scope updated.');
      } else {
        // Nothing changed
        onOpenChange(false);
        setIsPending(false);
        return;
      }

      onOpenChange(false);
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setIsPending(false);
    }
  };

  if (!collaborator) return null;

  const initials = collaborator.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Collaborator</DialogTitle>
          <DialogDescription>
            Change the role and permissions for this collaborator.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Collaborator info */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <Avatar className="h-9 w-9">
              {collaborator.avatarUrl && (
                <AvatarImage
                  src={collaborator.avatarUrl}
                  alt={collaborator.fullName}
                />
              )}
              <AvatarFallback className="bg-blue-100 text-xs font-medium text-blue-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{collaborator.fullName}</p>
              <p className="text-muted-foreground text-xs">
                {collaborator.email}
              </p>
            </div>
          </div>

          {/* Role selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Role</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedRole(option.value)}
                  className={cn(
                    'flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors',
                    selectedRole === option.value
                      ? 'border-primary bg-primary/5 ring-primary/20 ring-1'
                      : 'hover:bg-muted/50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </div>
                  <span className="text-muted-foreground text-xs leading-snug">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Scope picker (only for seating managers) */}
          {selectedRole === 'seating_manager' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assigned Scope</Label>
              <div className="rounded-lg border p-3">
                <ScopePicker
                  groups={groups}
                  guests={guests}
                  selectedGroups={selectedGroups}
                  selectedGuests={selectedGuests}
                  onGroupsChange={setSelectedGroups}
                  onGuestsChange={setSelectedGuests}
                />
              </div>
            </div>
          )}

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
