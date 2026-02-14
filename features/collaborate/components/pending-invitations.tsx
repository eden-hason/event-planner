'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconCopy, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import { revokeInvitation } from '../actions';
import { RoleBadge } from './role-badge';
import { buildInvitationLink, getExpiryText } from '../utils';
import type { InvitationApp } from '../schemas';

interface PendingInvitationsProps {
  invitations: InvitationApp[];
}

export function PendingInvitations({ invitations }: PendingInvitationsProps) {
  if (invitations.length === 0) return null;

  const handleCopyLink = async (token: string) => {
    const link = buildInvitationLink(token);
    await navigator.clipboard.writeText(link);
    toast.success('Invitation link copied to clipboard.');
  };

  const handleRevoke = async (invitation: InvitationApp) => {
    const promise = revokeInvitation(invitation.id).then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Failed to revoke invitation.');
      }
      return result;
    });

    toast.promise(promise, {
      loading: 'Revoking invitation...',
      success: (data) => data.message || 'Invitation revoked.',
      error: (err) =>
        err instanceof Error ? err.message : 'Something went wrong.',
    });
  };

  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-sm font-medium">
        Pending Invitations
      </h3>
      {invitations.map((invitation) => (
        <Card key={invitation.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {invitation.invitedEmail}
                </span>
                <RoleBadge role={invitation.role} />
              </div>
              <p className="text-muted-foreground text-xs">
                {getExpiryText(invitation.expiresAt)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleCopyLink(invitation.token)}
              >
                <IconCopy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive h-8 w-8"
                onClick={() => handleRevoke(invitation)}
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
