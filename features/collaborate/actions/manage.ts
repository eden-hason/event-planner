'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/features/auth/queries';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '../schemas';

export async function removeCollaborator(
  collaboratorId: string,
): Promise<ActionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in.' };
    }

    const supabase = await createClient();

    // Fetch the collaborator to be removed
    const { data: target, error: fetchError } = await supabase
      .from('event_collaborators')
      .select('id, event_id, user_id, role, is_creator, profiles!event_collaborators_user_id_profiles_fk(email)')
      .eq('id', collaboratorId)
      .single();

    if (fetchError || !target) {
      return { success: false, message: 'Collaborator not found.' };
    }

    // Cannot remove the creator
    if (target.is_creator) {
      return {
        success: false,
        message: 'Cannot remove the event creator.',
      };
    }

    // Verify caller is an owner
    const { data: callerCollab } = await supabase
      .from('event_collaborators')
      .select('role')
      .eq('event_id', target.event_id)
      .eq('user_id', currentUser.id)
      .single();

    if (!callerCollab || callerCollab.role !== 'owner') {
      return {
        success: false,
        message: 'Only owners can remove collaborators.',
      };
    }

    // Check this isn't the last owner
    if (target.role === 'owner') {
      const { count } = await supabase
        .from('event_collaborators')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', target.event_id)
        .eq('role', 'owner');

      if ((count ?? 0) <= 1) {
        return {
          success: false,
          message: 'Cannot remove the last owner.',
        };
      }
    }

    // Delete collaborator (cascades scope)
    const { error: deleteError } = await supabase
      .from('event_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (deleteError) {
      console.error('Error removing collaborator:', deleteError);
      return { success: false, message: 'Failed to remove collaborator.' };
    }

    // Audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetEmail = (target.profiles as any)?.email ?? '';
    await supabase.from('collaboration_audit_log').insert({
      event_id: target.event_id,
      actor_id: currentUser.id,
      target_email: targetEmail,
      action: 'removed',
      metadata: { role: target.role },
    });

    revalidatePath(`/app/${target.event_id}/settings`);
    revalidatePath('/app');

    return {
      success: true,
      message: 'Collaborator removed successfully.',
    };
  } catch (error) {
    console.error('Remove collaborator error:', error);
    return { success: false, message: 'Failed to remove collaborator.' };
  }
}

export async function updateCollaboratorScope(
  collaboratorId: string,
  formData: FormData,
): Promise<ActionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in.' };
    }

    const scopeGroups: string[] = JSON.parse(
      (formData.get('scopeGroups') as string) || '[]',
    );
    const scopeGuests: string[] = JSON.parse(
      (formData.get('scopeGuests') as string) || '[]',
    );

    if (scopeGroups.length === 0 && scopeGuests.length === 0) {
      return {
        success: false,
        message: 'At least one group or guest is required.',
      };
    }

    const supabase = await createClient();

    // Fetch the collaborator
    const { data: target, error: fetchError } = await supabase
      .from('event_collaborators')
      .select('id, event_id, user_id, role, profiles!event_collaborators_user_id_profiles_fk(email)')
      .eq('id', collaboratorId)
      .single();

    if (fetchError || !target) {
      return { success: false, message: 'Collaborator not found.' };
    }

    if (target.role !== 'seating_manager') {
      return {
        success: false,
        message: 'Scope can only be set for seating managers.',
      };
    }

    // Verify caller is an owner
    const { data: callerCollab } = await supabase
      .from('event_collaborators')
      .select('role')
      .eq('event_id', target.event_id)
      .eq('user_id', currentUser.id)
      .single();

    if (!callerCollab || callerCollab.role !== 'owner') {
      return {
        success: false,
        message: 'Only owners can modify scope.',
      };
    }

    // Delete existing scope
    await supabase
      .from('collaborator_guest_scope')
      .delete()
      .eq('collaborator_id', collaboratorId);

    // Insert new scope
    const scopeEntries: Array<{
      collaborator_id: string;
      guest_id?: string;
      group_id?: string;
    }> = [];

    for (const groupId of scopeGroups) {
      scopeEntries.push({ collaborator_id: collaboratorId, group_id: groupId });
    }

    for (const guestId of scopeGuests) {
      scopeEntries.push({
        collaborator_id: collaboratorId,
        guest_id: guestId,
      });
    }

    if (scopeEntries.length > 0) {
      const { error: insertError } = await supabase
        .from('collaborator_guest_scope')
        .insert(scopeEntries);

      if (insertError) {
        console.error('Error inserting scope:', insertError);
        return { success: false, message: 'Failed to update scope.' };
      }
    }

    // Audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetEmail = (target.profiles as any)?.email ?? '';
    await supabase.from('collaboration_audit_log').insert({
      event_id: target.event_id,
      actor_id: currentUser.id,
      target_email: targetEmail,
      action: 'scope_changed',
      metadata: { scopeGroups, scopeGuests },
    });

    revalidatePath(`/app/${target.event_id}/settings`);

    return {
      success: true,
      message: 'Scope updated successfully.',
    };
  } catch (error) {
    console.error('Update scope error:', error);
    return { success: false, message: 'Failed to update scope.' };
  }
}

export async function revokeInvitation(
  invitationId: string,
): Promise<ActionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in.' };
    }

    const supabase = await createClient();

    // Fetch invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('collaboration_invitations')
      .select('id, event_id')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      return { success: false, message: 'Invitation not found.' };
    }

    // Delete invitation
    const { error: deleteError } = await supabase
      .from('collaboration_invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      console.error('Error revoking invitation:', deleteError);
      return { success: false, message: 'Failed to revoke invitation.' };
    }

    revalidatePath(`/app/${invitation.event_id}/settings`);

    return {
      success: true,
      message: 'Invitation revoked.',
    };
  } catch (error) {
    console.error('Revoke invitation error:', error);
    return { success: false, message: 'Failed to revoke invitation.' };
  }
}
