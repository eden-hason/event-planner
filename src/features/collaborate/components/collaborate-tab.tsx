'use client';

import * as React from 'react';
import {
  IconUserPlus,
  IconUsersGroup,
  IconClipboardCheck,
  IconRefresh,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { CollaboratorsList } from './collaborators-list';
import { PendingInvitations } from './pending-invitations';
import { InviteCollaboratorDialog } from './invite-collaborator-dialog';
import { CollaboratorConfigDialog } from './collaborator-config-dialog';
import { getCollaboratorScope } from '../queries';
import type { CollaboratorApp, InvitationApp } from '../schemas';
import type { GroupApp, GuestApp } from '@/features/guests/schemas';

interface CollaborateTabProps {
  eventId: string;
  currentUserId?: string;
  collaborators: CollaboratorApp[];
  invitations: InvitationApp[];
  groups: GroupApp[];
  guests: GuestApp[];
}

export function CollaborateTab({
  eventId,
  currentUserId,
  collaborators,
  invitations,
  groups,
  guests,
}: CollaborateTabProps) {
  const t = useTranslations('collaborate.tab');
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);
  const [configDialogOpen, setConfigDialogOpen] = React.useState(false);
  const [editingCollaborator, setEditingCollaborator] =
    React.useState<CollaboratorApp | null>(null);
  const [scopeGroupIds, setScopeGroupIds] = React.useState<string[]>([]);
  const [scopeGuestIds, setScopeGuestIds] = React.useState<string[]>([]);

  const handleConfigure = async (collaborator: CollaboratorApp) => {
    setEditingCollaborator(collaborator);
    // Fetch current scope for seating managers
    if (collaborator.role === 'seating_manager') {
      const scope = await getCollaboratorScope(collaborator.id);
      setScopeGroupIds(scope.groupIds);
      setScopeGuestIds(scope.guestIds);
    } else {
      setScopeGroupIds([]);
      setScopeGuestIds([]);
    }
    setConfigDialogOpen(true);
  };

  const FEATURES = [
    {
      icon: IconUsersGroup,
      iconClassName: 'text-primary bg-primary/10',
      title: t('features.shareWorkload'),
      description: t('features.shareWorkloadDesc'),
    },
    {
      icon: IconClipboardCheck,
      iconClassName: 'text-primary bg-primary/10',
      title: t('features.getHelp'),
      description: t('features.getHelpDesc'),
    },
    {
      icon: IconRefresh,
      iconClassName: 'text-primary bg-primary/10',
      title: t('features.keepSync'),
      description: t('features.keepSyncDesc'),
    },
  ];

  // Only creator row means no other collaborators
  const hasOnlySelf =
    collaborators.length <= 1 && invitations.length === 0;

  return (
    <div className="space-y-6">
      {hasOnlySelf ? (
        <div className="flex flex-col items-center px-6 py-14">
          <div className="relative mb-6">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/10">
              <IconUserPlus className="h-14 w-14 text-primary" strokeWidth={1.5} />
            </div>
            <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
              <span className="text-lg font-bold leading-none">+</span>
            </span>
          </div>

          <h2 className="mb-1 text-xl font-semibold tracking-tight">
            {t('heading')}
          </h2>

          <p className="text-muted-foreground mb-8 max-w-md text-center text-sm leading-relaxed">
            {t('description')}
          </p>

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

          <Button
            size="lg"
            className="rounded-full px-8"
            onClick={() => setInviteDialogOpen(true)}
          >
            <IconUserPlus className="mr-2 h-5 w-5" />
            {t('inviteButton')}
          </Button>

        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase">
              {t('activeMembers')}
            </h3>
            <CollaboratorsList
              collaborators={collaborators}
              currentUserId={currentUserId}
              onConfigure={handleConfigure}
            />
          </div>
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

      <CollaboratorConfigDialog
        collaborator={editingCollaborator}
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        groups={groups}
        guests={guests}
        initialGroupIds={scopeGroupIds}
        initialGuestIds={scopeGuestIds}
      />
    </div>
  );
}
