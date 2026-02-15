'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Fetches RSVP statistics for a schedule from guest_interactions.
 *
 * @param scheduleId - The schedule ID
 * @returns RSVP counts for confirmed and declined
 */
export async function getRsvpStats(scheduleId: string): Promise<{
  confirmed: number;
  declined: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('guest_interactions')
    .select('guest_id, interaction_type, created_at')
    .eq('schedule_id', scheduleId)
    .in('interaction_type', ['rsvp_confirm', 'rsvp_decline'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching RSVP stats:', error);
    return { confirmed: 0, declined: 0 };
  }

  if (!data) {
    return { confirmed: 0, declined: 0 };
  }

  // Deduplicate: keep only the latest interaction per guest
  const latestByGuest = new Map<string, string>();
  for (const record of data) {
    if (!latestByGuest.has(record.guest_id)) {
      latestByGuest.set(record.guest_id, record.interaction_type);
    }
  }

  let confirmed = 0;
  let declined = 0;

  for (const type of latestByGuest.values()) {
    if (type === 'rsvp_confirm') confirmed++;
    else if (type === 'rsvp_decline') declined++;
  }

  return { confirmed, declined };
}
