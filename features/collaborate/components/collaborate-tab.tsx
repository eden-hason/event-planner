'use client';

import * as React from 'react';
import {
  IconUserPlus,
  IconUsersGroup,
  IconClipboardCheck,
  IconRefresh,
  IconPlus,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { CollaboratorsList } from './collaborators-list';
import { PendingInvitations } from './pending-invitations';
import { InviteCollaboratorDialog } from './invite-collaborator-dialog';
import { EditScopeDrawer } from './edit-scope-drawer';
import { getCollaboratorScope } from '../queries';
import type { CollaboratorApp, InvitationApp } from '../schemas';
import type { GroupApp, GuestApp } from '@/features/guests/schemas';

const FEATURES = [
  {
    icon: IconUsersGroup,
    iconClassName: 'text-blue-500 bg-blue-50',
    title: 'Share the workload',
    description: 'Distribute tasks easily',
  },
  {
    icon: IconClipboardCheck,
    iconClassName: 'text-purple-500 bg-purple-50',
    title: 'Get specific help',
    description: 'Assign specific tasks',
  },
  {
    icon: IconRefresh,
    iconClassName: 'text-indigo-500 bg-indigo-50',
    title: 'Keep everyone in sync',
    description: 'Real-time updates',
  },
] as const;

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
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);
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
        <div className="flex flex-col items-center px-6 py-14">
          {/* Hero illustration */}
          <div className="relative mb-6">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-100/60">
              <IconUserPlus className="h-14 w-14 text-blue-500" strokeWidth={1.5} />
            </div>
            <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-md">
              <span className="text-lg font-bold leading-none">+</span>
            </span>
          </div>

          {/* Heading */}
          <h2 className="mb-1 text-xl font-semibold tracking-tight">
            Collaborate with others
          </h2>

          {/* Description */}
          <p className="text-muted-foreground mb-8 max-w-md text-center text-sm leading-relaxed">
            Invite your partner, family, or friends to help manage this event.
            You can assign different roles and permissions to keep everything
            organized.
          </p>

          {/* Feature cards */}
          <div className="mb-8 grid w-full max-w-lg grid-cols-3 gap-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col items-center rounded-xl border bg-white px-3 py-5 text-center shadow-sm"
              >
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${feature.iconClassName}`}
                >
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{feature.title}</span>
                <span className="text-muted-foreground mt-0.5 text-[11px]">
                  {feature.description}
                </span>
              </div>
            ))}
          </div>

          {/* Invite button */}
          <Button
            size="lg"
            className="rounded-full px-8"
            onClick={() => setInviteDialogOpen(true)}
          >
            <IconUserPlus className="mr-2 h-5 w-5" />
            Invite Collaborator
          </Button>

          {/* Help link */}
          <p className="text-muted-foreground mt-4 text-xs">
            Need help?{' '}
            <a
              href="#"
              className="text-primary underline-offset-4 hover:underline"
            >
              Read our guide on permissions
            </a>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-muted-foreground text-sm font-medium">
              Active Members
            </h3>
            <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
              <IconPlus className="mr-1.5 h-4 w-4" />
              Invite
            </Button>
          </div>
          <CollaboratorsList
            collaborators={collaborators}
            onEditScope={handleEditScope}
          />
          <PendingInvitations invitations={invitations} />
        </div>
      )}

      <InviteCollaboratorDialog
        eventId={eventId}
        groups={groups}
        guests={guests}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />

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
