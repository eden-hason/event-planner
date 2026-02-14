'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/features/auth/queries';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '../schemas';

export async function acceptInvitation(token: string): Promise<ActionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in.' };
    }

    const supabase = await createClient();

    // Call the SECURITY DEFINER function that handles the entire accept flow
    // (insert collaborator, copy scope, update invitation, audit log)
    // bypassing RLS since the invitee isn't a collaborator yet.
    const { data, error } = await supabase.rpc(
      'accept_collaboration_invitation',
      { p_token: token },
    );

    if (error) {
      console.error('Error accepting invitation:', error);
      return { success: false, message: 'Failed to accept invitation.' };
    }

    if (!data?.success) {
      return {
        success: false,
        message: data?.message || 'Failed to accept invitation.',
      };
    }

    const eventId = data.event_id;
    if (eventId) {
      revalidatePath(`/app/${eventId}/settings`);
    }
    revalidatePath('/app');

    return {
      success: true,
      message: data.message || 'Invitation accepted!',
      invitationLink: eventId ? `/app/${eventId}/dashboard` : null,
    };
  } catch (error) {
    console.error('Accept invitation error:', error);
    return { success: false, message: 'Failed to accept invitation.' };
  }
}

export async function declineInvitation(token: string): Promise<ActionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in.' };
    }

    const supabase = await createClient();

    // Fetch invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('collaboration_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !invitation) {
      return { success: false, message: 'Invitation not found.' };
    }

    if (invitation.status !== 'pending') {
      return {
        success: false,
        message: `This invitation has already been ${invitation.status}.`,
      };
    }

    // Update invitation status
    await supabase
      .from('collaboration_invitations')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    // Audit log
    await supabase.from('collaboration_audit_log').insert({
      event_id: invitation.event_id,
      actor_id: currentUser.id,
      target_email: currentUser.email,
      action: 'declined',
      metadata: { role: invitation.role },
    });

    revalidatePath(`/app/${invitation.event_id}/settings`);

    return {
      success: true,
      message: 'Invitation declined.',
    };
  } catch (error) {
    console.error('Decline invitation error:', error);
    return { success: false, message: 'Failed to decline invitation.' };
  }
}
