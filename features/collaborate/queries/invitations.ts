'use server';

import { createClient } from '@/lib/supabase/server';
import {
  InvitationDbToAppSchema,
  type InvitationApp,
} from '../schemas';

/**
 * Fetches pending (non-expired) invitations for an event.
 */
export async function getEventInvitations(
  eventId: string,
): Promise<InvitationApp[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('collaboration_invitations')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching event invitations:', error);
      return [];
    }

    return (data || []).map((row) => InvitationDbToAppSchema.parse(row));
  } catch (error) {
    console.error('Error in getEventInvitations:', error);
    return [];
  }
}

/**
 * Fetches an invitation by its token, including the event title.
 * Uses a SECURITY DEFINER RPC function to bypass RLS — safe because
 * tokens are unguessable UUIDs and the page needs to display info
 * (expired, already responded) before the user authenticates.
 */
export async function getInvitationByToken(
  token: string,
): Promise<(InvitationApp & { eventTitle: string }) | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_invitation_by_token', {
      p_token: token,
    });

    if (error || !data) {
      if (error) {
        console.error('Error fetching invitation by token:', error);
      }
      return null;
    }

    const invitation = InvitationDbToAppSchema.parse(data);
    const eventTitle = data.event_title ?? 'Unknown Event';

    return {
      ...invitation,
      eventTitle,
    };
  } catch (error) {
    console.error('Error in getInvitationByToken:', error);
    return null;
  }
}
