import { createClient } from '@/lib/supabase/server';
import type { RecentRsvpRow } from '../types';

export async function getRecentRsvpActivity(
  eventId: string,
  limit = 8,
): Promise<RecentRsvpRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('guests')
    .select('id, name, rsvp_status, rsvp_changed_at, rsvp_changed_by_name, rsvp_change_source')
    .eq('event_id', eventId)
    .not('rsvp_changed_at', 'is', null)
    .order('rsvp_changed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent RSVP activity:', error);
    return [];
  }

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    rsvpStatus: row.rsvp_status as 'pending' | 'confirmed' | 'declined',
    rsvpChangedAt: row.rsvp_changed_at as string,
    rsvpChangedByName: row.rsvp_changed_by_name ?? null,
    rsvpChangeSource: row.rsvp_change_source as 'manual' | 'guest' | null,
  }));
}
