'use server';

import { getEffectiveClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requestOrigin } from '@/features/auth/actions/origin';
import { buildCoPlannerLink } from '../utils';
import type { CoPlannerLinkPreview } from '../types';

/**
 * The Event's Co-planner Link as a full URL, or null when the viewer may not
 * read it - a Visitor, who saves first (ADR 0028), or someone not on the Event.
 * Every Event has one from birth (ADR 0041), so null is never "not made yet".
 */
export async function getCoPlannerLink(eventId: string): Promise<string | null> {
  try {
    const { supabase } = await getEffectiveClient();

    const { data, error } = await supabase
      .from('co_planner_links')
      .select('token')
      .eq('event_id', eventId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching co-planner link:', error);
      return null;
    }
    if (!data) return null;

    return buildCoPlannerLink(await requestOrigin(), data.token);
  } catch (error) {
    console.error('Error in getCoPlannerLink:', error);
    return null;
  }
}

/**
 * What the link's page shows before anyone signs in. Read through a SECURITY
 * DEFINER function: the reader is not on the Event yet, and may have no
 * session at all. The token is the only key.
 */
export async function getCoPlannerLinkPreview(
  token: string,
): Promise<CoPlannerLinkPreview | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .rpc('get_co_planner_link_preview', { p_token: token })
      .maybeSingle<{
        event_id: string;
        event_title: string | null;
        inviter_name: string | null;
        already_member: boolean;
      }>();

    if (error) {
      console.error('Error fetching co-planner link preview:', error);
      return null;
    }
    if (!data) return null;

    return {
      eventId: data.event_id,
      eventTitle: data.event_title ?? '',
      inviterName: data.inviter_name,
      alreadyMember: data.already_member,
    };
  } catch (error) {
    console.error('Error in getCoPlannerLinkPreview:', error);
    return null;
  }
}
