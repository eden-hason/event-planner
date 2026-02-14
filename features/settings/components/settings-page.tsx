'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { IconUserPlus } from '@tabler/icons-react';
import { useFeatureHeader, useCollaboration } from '@/components/feature-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CollaborateTab } from '@/features/collaborate/components/collaborate-tab';
import { InviteCollaboratorDialog } from '@/features/collaborate/components/invite-collaborator-dialog';
import type { CollaboratorApp, InvitationApp } from '@/features/collaborate/schemas';
import type { GroupApp, GuestApp } from '@/features/guests/schemas';

const TAB_HEADERS: Record<
  string,
  { title: string; description: string }
> = {
  team: {
    title: 'Team & Collaborators',
    description: 'Invite others to help manage this event.',
  },
};

interface SettingsPageProps {
  eventId: string;
  collaborators: CollaboratorApp[];
  invitations: InvitationApp[];
  groups: GroupApp[];
  guests: GuestApp[];
}

export function SettingsPage({
  eventId,
  collaborators,
  invitations,
  groups,
  guests,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState('team');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { isOwner } = useCollaboration();

  const handleOpenInviteDialog = useCallback(() => setInviteDialogOpen(true), []);

  const headerConfig = useMemo(
    () => ({
      ...TAB_HEADERS[activeTab],
      action:
        activeTab === 'team' && isOwner ? (
          <Button size="sm" onClick={handleOpenInviteDialog}>
            <IconUserPlus className="mr-1.5 h-4 w-4" />
            Invite
          </Button>
        ) : undefined,
    }),
    [activeTab, isOwner, handleOpenInviteDialog],
  );
  const { setHeader } = useFeatureHeader(headerConfig);
  useEffect(() => {
    setHeader(headerConfig);
  }, [headerConfig, setHeader]);

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-border mb-4 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="team"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Team & Collaborators
          </TabsTrigger>
        </TabsList>
        <TabsContent value="team">
          <CollaborateTab
            eventId={eventId}
            collaborators={collaborators}
            invitations={invitations}
            groups={groups}
            guests={guests}
          />
        </TabsContent>
      </Tabs>

      <InviteCollaboratorDialog
        eventId={eventId}
        groups={groups}
        guests={guests}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </>
  );
}
