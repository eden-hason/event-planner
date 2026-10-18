'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/features/auth/queries';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '../schemas';

/**
 * Removes an Owner from the Event. Anyone on the Event may, except on the
 * creator; RLS decides who is on it. The Co-planner Link cannot be reset yet,
 * so a removed Owner can rejoin through it (backlog 0026).
 */
export async function removeCollaborator(
  collaboratorId: string,
): Promise<ActionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in' };
    }

    const supabase = await createClient();

    const { data: target, error: fetchError } = await supabase
      .from('event_collaborators')
      .select('id, event_id, user_id, is_creator, profiles!event_collaborators_user_id_profiles_fk(email, phone_number)')
      .eq('id', collaboratorId)
      .single();

    if (fetchError || !target) {
      return { success: false, message: 'Collaborator not found' };
    }

    if (target.is_creator) {
      return { success: false, message: 'Cannot remove the event creator' };
    }

    const { error: deleteError } = await supabase
      .from('event_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (deleteError) {
      console.error('Error removing collaborator:', deleteError);
      return { success: false, message: 'Failed to remove collaborator' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = target.profiles as any;
    await supabase.from('collaboration_audit_log').insert({
      event_id: target.event_id,
      actor_id: currentUser.id,
      target_email: profile?.email ?? profile?.phone_number ?? '',
      action: 'removed',
    });

    revalidatePath(`/app/${target.event_id}/collaborate`);
    revalidatePath('/app');

    return { success: true, message: 'Collaborator removed' };
  } catch (error) {
    console.error('Remove collaborator error:', error);
    return { success: false, message: 'Failed to remove collaborator' };
  }
}
