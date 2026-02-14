'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/features/auth/queries';
import { revalidatePath } from 'next/cache';
import { InviteFormSchema, type ActionState } from '../schemas';
import { generateInviteToken, buildInvitationLink } from '../utils';

export async function createInvitation(
  eventId: string,
  formData: FormData,
): Promise<ActionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in.' };
    }

    const rawData = {
      email: formData.get('email') as string,
      role: formData.get('role') as string,
      scopeGroups: JSON.parse(
        (formData.get('scopeGroups') as string) || '[]',
      ),
      scopeGuests: JSON.parse(
        (formData.get('scopeGuests') as string) || '[]',
      ),
    };

    const validation = InviteFormSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        message: validation.error.issues[0].message,
      };
    }

    const { email, role, scopeGroups, scopeGuests } = validation.data;
    const supabase = await createClient();

    // Verify caller is an owner of this event
    const { data: callerCollab } = await supabase
      .from('event_collaborators')
      .select('role')
      .eq('event_id', eventId)
      .eq('user_id', currentUser.id)
      .single();

    if (!callerCollab || callerCollab.role !== 'owner') {
      return { success: false, message: 'Only owners can invite collaborators.' };
    }

    // Check max 2 owners
    if (role === 'owner') {
      const { count } = await supabase
        .from('event_collaborators')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('role', 'owner');

      if ((count ?? 0) >= 2) {
        return {
          success: false,
          message: 'Maximum of 2 owners per event.',
        };
      }
    }

    // Check email is not already a collaborator
    const { data: existingCollab } = await supabase
      .from('event_collaborators')
      .select('id, profiles!event_collaborators_user_id_profiles_fk(email)')
      .eq('event_id', eventId);

    const alreadyCollaborator = (existingCollab || []).some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c) => (c.profiles as any)?.email === email,
    );

    if (alreadyCollaborator) {
      return {
        success: false,
        message: 'This person is already a collaborator on this event.',
      };
    }

    // Check for existing pending invitation with same email
    const { data: existingInvite } = await supabase
      .from('collaboration_invitations')
      .select('id')
      .eq('event_id', eventId)
      .eq('invited_email', email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      return {
        success: false,
        message: 'A pending invitation already exists for this email.',
      };
    }

    // Validate seating manager has scope
    if (
      role === 'seating_manager' &&
      scopeGroups.length === 0 &&
      scopeGuests.length === 0
    ) {
      return {
        success: false,
        message:
          'Seating managers must have at least one group or guest in their scope.',
      };
    }

    // Create invitation
    const token = generateInviteToken();

    const { error: insertError } = await supabase
      .from('collaboration_invitations')
      .insert({
        event_id: eventId,
        invited_by: currentUser.id,
        invited_email: email,
        role,
        token,
        scope_groups: scopeGroups,
        scope_guests: scopeGuests,
      });

    if (insertError) {
      console.error('Error creating invitation:', insertError);
      return { success: false, message: 'Failed to create invitation.' };
    }

    // Audit log
    await supabase.from('collaboration_audit_log').insert({
      event_id: eventId,
      actor_id: currentUser.id,
      target_email: email,
      action: 'invited',
      metadata: { role, scopeGroups, scopeGuests },
    });

    const invitationLink = buildInvitationLink(token);

    revalidatePath(`/app/${eventId}/settings`);

    return {
      success: true,
      message: 'Invitation created successfully.',
      invitationLink,
    };
  } catch (error) {
    console.error('Create invitation error:', error);
    return { success: false, message: 'Failed to create invitation.' };
  }
}
