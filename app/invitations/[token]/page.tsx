import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getInvitationByToken } from '@/features/collaborate/queries';
import { InvitationResponsePage } from './invitation-response-page';

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold">Invitation Not Found</h1>
          <p className="text-muted-foreground">
            This invitation link is invalid or has been revoked.
          </p>
        </div>
      </div>
    );
  }

  // Check if expired
  if (new Date(invitation.expiresAt) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold">Invitation Expired</h1>
          <p className="text-muted-foreground">
            This invitation has expired. Please ask the event owner to send a
            new one.
          </p>
        </div>
      </div>
    );
  }

  // Check if already responded
  if (invitation.status !== 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold">
            Invitation Already {invitation.status === 'accepted' ? 'Accepted' : 'Declined'}
          </h1>
          <p className="text-muted-foreground">
            {invitation.status === 'accepted'
              ? 'You have already accepted this invitation.'
              : 'This invitation has been declined.'}
          </p>
        </div>
      </div>
    );
  }

  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login with return URL
    redirect(`/login?next=/invitations/${token}`);
  }

  // Check email mismatch
  if (user.email !== invitation.invitedEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold">Email Mismatch</h1>
          <p className="text-muted-foreground">
            This invitation was sent to{' '}
            <strong>{invitation.invitedEmail}</strong>, but you are logged in as{' '}
            <strong>{user.email}</strong>. Please log in with the correct
            account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <InvitationResponsePage
      invitation={invitation}
      token={token}
    />
  );
}
