'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { JoinResult } from '../types';

/**
 * Joins the signed-in user to the Co-planner Link's Event as an Owner
 * (ADR 0041). Nothing is matched against who they are: the link is the
 * invitation. Already being on the Event is a success with `joined: false`.
 */
export async function joinEventByCoPlannerLink(token: string): Promise<JoinResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('join_event_by_co_planner_link', {
      p_token: token,
    });

    if (error) {
      console.error('Error joining event by co-planner link:', error);
      return { success: false, reason: 'failed' };
    }

    if (!data?.success) {
      const reason = data?.reason;
      return {
        success: false,
        reason:
          reason === 'not_signed_in' || reason === 'visitor' || reason === 'not_found'
            ? reason
            : 'failed',
      };
    }

    revalidatePath('/app', 'layout');

    return { success: true, eventId: data.event_id, joined: Boolean(data.joined) };
  } catch (error) {
    console.error('Join event by co-planner link error:', error);
    return { success: false, reason: 'failed' };
  }
}
