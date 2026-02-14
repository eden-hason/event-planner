'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  acceptInvitation,
  declineInvitation,
} from '@/features/collaborate/actions';
import { ROLE_LABELS } from '@/features/collaborate/schemas';
import type { InvitationApp } from '@/features/collaborate/schemas';

interface InvitationResponsePageProps {
  invitation: InvitationApp & { eventTitle: string };
  token: string;
}

export function InvitationResponsePage({
  invitation,
  token,
}: InvitationResponsePageProps) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);

  const handleAccept = async () => {
    setIsPending(true);
    try {
      const result = await acceptInvitation(token);
      if (result.success) {
        toast.success(result.message);
        router.push(`/app/${invitation.eventId}/dashboard`);
      } else {
        toast.error(result.message || 'Failed to accept invitation.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setIsPending(false);
    }
  };

  const handleDecline = async () => {
    setIsPending(true);
    try {
      const result = await declineInvitation(token);
      if (result.success) {
        toast.success(result.message);
        router.push('/app');
      } else {
        toast.error(result.message || 'Failed to decline invitation.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Event Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-2 text-sm">
              You have been invited to collaborate on
            </p>
            <h2 className="mb-2 text-xl font-semibold">
              {invitation.eventTitle}
            </h2>
            <Badge variant="secondary">
              {ROLE_LABELS[invitation.role]}
            </Badge>
            {invitation.role === 'seating_manager' && (
              <p className="text-muted-foreground mt-2 text-xs">
                You will have view-only access to assigned guests and groups.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDecline}
              disabled={isPending}
            >
              Decline
            </Button>
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={isPending}
            >
              {isPending ? 'Processing...' : 'Accept'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
