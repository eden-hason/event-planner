'use client';

import * as React from 'react';
import { IconUsers } from '@tabler/icons-react';
import { CollaboratorsList } from './collaborators-list';
import { PendingInvitations } from './pending-invitations';
import { InviteCollaboratorDialog } from './invite-collaborator-dialog';
import { EditScopeDrawer } from './edit-scope-drawer';
import { getCollaboratorScope } from '../queries';
import type { CollaboratorApp, InvitationApp } from '../schemas';
import type { GroupApp, GuestApp } from '@/features/guests/schemas';

interface CollaborateTabProps {
  eventId: string;
  collaborators: CollaboratorApp[];
  invitations: InvitationApp[];
  groups: GroupApp[];
  guests: GuestApp[];
}

export function CollaborateTab({
  eventId,
  collaborators,
  invitations,
  groups,
  guests,
}: CollaborateTabProps) {
  const [scopeDrawerOpen, setScopeDrawerOpen] = React.useState(false);
  const [editingCollaborator, setEditingCollaborator] =
    React.useState<CollaboratorApp | null>(null);
  const [scopeGroupIds, setScopeGroupIds] = React.useState<string[]>([]);
  const [scopeGuestIds, setScopeGuestIds] = React.useState<string[]>([]);

  const handleEditScope = async (collaborator: CollaboratorApp) => {
    setEditingCollaborator(collaborator);
    // Fetch current scope
    const scope = await getCollaboratorScope(collaborator.id);
    setScopeGroupIds(scope.groupIds);
    setScopeGuestIds(scope.guestIds);
    setScopeDrawerOpen(true);
  };

  // Only creator row means no other collaborators
  const hasOnlySelf =
    collaborators.length <= 1 && invitations.length === 0;

  return (
    <div className="space-y-6">
      {hasOnlySelf ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <IconUsers className="text-muted-foreground mb-3 h-10 w-10" />
          <h3 className="mb-1 text-sm font-medium">No collaborators yet</h3>
          <p className="text-muted-foreground mb-4 max-w-sm text-center text-xs">
            Invite co-owners to help manage the entire event, or seating
            managers with view-only access to specific guest groups.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <CollaboratorsList
            collaborators={collaborators}
            onEditScope={handleEditScope}
          />
          <PendingInvitations invitations={invitations} />
        </div>
      )}

      <EditScopeDrawer
        collaborator={editingCollaborator}
        open={scopeDrawerOpen}
        onOpenChange={setScopeDrawerOpen}
        groups={groups}
        guests={guests}
        initialGroupIds={scopeGroupIds}
        initialGuestIds={scopeGuestIds}
      />
    </div>
  );
}
