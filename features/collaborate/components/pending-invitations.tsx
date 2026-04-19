'use client';

import { Button } from '@/components/ui/button';
import { IconMail, IconClock } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { revokeInvitation } from '../actions';
import { RoleBadge } from './role-badge';
import { buildInvitationLink, getExpiryText } from '../utils';
import type { InvitationApp } from '../schemas';

interface PendingInvitationsProps {
  invitations: InvitationApp[];
}

export function PendingInvitations({ invitations }: PendingInvitationsProps) {
  const t = useTranslations('collaborate.pendingInvitations');

  if (invitations.length === 0) return null;

  const handleCopyLink = async (token: string) => {
    const link = buildInvitationLink(token);
    await navigator.clipboard.writeText(link);
    toast.success(t('toast.linkCopied'));
  };

  const handleRevoke = async (invitation: InvitationApp) => {
    const promise = revokeInvitation(invitation.id).then((result) => {
      if (!result.success) {
        throw new Error(result.message || t('toast.failed'));
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.revoking'),
      success: (data) => data.message || t('toast.revoked'),
      error: (err) =>
        err instanceof Error ? err.message : t('toast.failed'),
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          {t('title')}
        </h3>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-medium text-gray-500">
          {invitations.length}
        </span>
      </div>
      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between rounded-xl border border-dashed border-gray-300 bg-white px-5 py-4"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <IconMail className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <span className="text-base font-semibold text-gray-500">
                  {invitation.invitedEmail}
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <RoleBadge role={invitation.role} />
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    &middot;{' '}
                    <IconClock className="h-3 w-3" />
                    {t('expires')}{' '}
                    {new Date(invitation.expiresAt).toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric' },
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="link"
                size="sm"
                className="text-primary font-medium"
                onClick={() => handleCopyLink(invitation.token)}
              >
                {t('resend')}
              </Button>
              <span className="text-gray-300">|</span>
              <Button
                variant="link"
                size="sm"
                className="font-medium text-gray-500 hover:text-gray-700"
                onClick={() => handleRevoke(invitation)}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
