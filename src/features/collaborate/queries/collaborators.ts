'use server';

import { getEffectiveClient } from '@/lib/supabase/admin';
import { CollaboratorDbToAppSchema, type CollaboratorApp } from '../schemas';
import type { CollaboratorAccess } from '../types';

/**
 * Every Owner of an Event, the creator first, with their profile's name,
 * contact and avatar.
 */
export async function getEventCollaborators(
  eventId: string,
): Promise<CollaboratorApp[]> {
  try {
    const { supabase } = await getEffectiveClient();

    const { data, error } = await supabase
      .from('event_collaborators')
      .select(
        `
        id,
        event_id,
        user_id,
        is_creator,
        created_at,
        profiles!event_collaborators_user_id_profiles_fk (
          email,
          phone_number,
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

    return (data || []).map((row) => CollaboratorDbToAppSchema.parse(row));
  } catch (error) {
    console.error('Error in getEventCollaborators:', error);
    return [];
  }
}

/**
 * Whether the current user is on this Event, and if so whether they created
 * it. Every collaborator is an Owner (ADR 0041), so there is no role to return.
 */
export async function getCollaboratorAccess(
  eventId: string,
): Promise<CollaboratorAccess | null> {
  try {
    const { supabase, impersonation } = await getEffectiveClient();

    // Whose access this is. Under impersonation `supabase` is the service-role
    // client, which carries no session at all - asking it for the user returns
    // nobody, and every caller then reads the Operator as not on the Event. The
    // impersonation cookie already names who is being viewed, and
    // getImpersonation has checked the Operator's admin flag, so take the id
    // from there instead.
    const userId =
      impersonation?.userId ?? (await supabase.auth.getUser()).data.user?.id;

    if (!userId) return null;

    // The creator has a row too (auto_add_event_creator), marked is_creator.
    const { data, error } = await supabase
      .from('event_collaborators')
      .select('is_creator')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return { isCreator: data.is_creator };
  } catch (error) {
    console.error('Error in getCollaboratorAccess:', error);
    return null;
  }
}
