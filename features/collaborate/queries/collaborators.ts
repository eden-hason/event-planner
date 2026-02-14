'use server';

import { createClient } from '@/lib/supabase/server';
import type { CollaboratorApp, CollaboratorRole } from '../schemas';

/**
 * Fetches all collaborators for an event, with profile info from auth.users metadata.
 * Uses a join with profiles table for name/email/avatar.
 */
export async function getEventCollaborators(
  eventId: string,
): Promise<CollaboratorApp[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('event_collaborators')
      .select(
        `
        id,
        event_id,
        user_id,
        role,
        is_creator,
        created_at,
        profiles!event_collaborators_user_id_profiles_fk (
          email,
          full_name,
          avatar_url
        )
      `,
      )
      .eq('event_id', eventId)
      .order('is_creator', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching event collaborators:', error);
      return [];
    }

    // For each collaborator, get scope counts if seating_manager
    const collaborators: CollaboratorApp[] = [];

    for (const row of data || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = row.profiles as any;
      let scopeGroupCount = 0;
      let scopeGuestCount = 0;

      if (row.role === 'seating_manager') {
        const { count: guestCount } = await supabase
          .from('collaborator_guest_scope')
          .select('*', { count: 'exact', head: true })
          .eq('collaborator_id', row.id)
          .not('guest_id', 'is', null);

        const { count: groupCount } = await supabase
          .from('collaborator_guest_scope')
          .select('*', { count: 'exact', head: true })
          .eq('collaborator_id', row.id)
          .not('group_id', 'is', null);

        scopeGuestCount = guestCount ?? 0;
        scopeGroupCount = groupCount ?? 0;
      }

      collaborators.push({
        id: row.id,
        eventId: row.event_id,
        userId: row.user_id,
        role: row.role as CollaboratorApp['role'],
        isCreator: row.is_creator,
        email: profile?.email ?? '',
        fullName: profile?.full_name ?? profile?.email ?? '',
        avatarUrl: profile?.avatar_url ?? undefined,
        createdAt: row.created_at,
        scopeGroupCount,
        scopeGuestCount,
      });
    }

    return collaborators;
  } catch (error) {
    console.error('Error in getEventCollaborators:', error);
    return [];
  }
}

/**
 * Gets the current user's collaborator role on an event.
 */
export async function getCollaboratorRole(
  eventId: string,
): Promise<{ role: CollaboratorRole; isCreator: boolean } | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // First check if user is the event owner (user_id on events table)
    const { data: event } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .single();

    if (event?.user_id === user.id) {
      return { role: 'owner', isCreator: true };
    }

    // Then check event_collaborators
    const { data, error } = await supabase
      .from('event_collaborators')
      .select('role, is_creator')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) return null;

    return {
      role: data.role as CollaboratorRole,
      isCreator: data.is_creator,
    };
  } catch (error) {
    console.error('Error in getCollaboratorRole:', error);
    return null;
  }
}

/**
 * Gets the scope entries for a collaborator (for editing).
 */
export async function getCollaboratorScope(
  collaboratorId: string,
): Promise<{ guestIds: string[]; groupIds: string[] }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('collaborator_guest_scope')
      .select('guest_id, group_id')
      .eq('collaborator_id', collaboratorId);

    if (error) {
      console.error('Error fetching collaborator scope:', error);
      return { guestIds: [], groupIds: [] };
    }

    const guestIds: string[] = [];
    const groupIds: string[] = [];

    for (const row of data || []) {
      if (row.guest_id) guestIds.push(row.guest_id);
      if (row.group_id) groupIds.push(row.group_id);
    }

    return { guestIds, groupIds };
  } catch (error) {
    console.error('Error in getCollaboratorScope:', error);
    return { guestIds: [], groupIds: [] };
  }
}
