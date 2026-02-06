import { createClient } from '@/lib/supabase/server';
import { ScheduleDbToAppSchema, type ScheduleApp } from '../schemas';

/**
 * Fetches all schedules for a given event.
 *
 * @param eventId - The event ID to fetch schedules for
 * @returns Array of schedules in app format
 */
export async function getSchedulesByEventId(
  eventId: string,
): Promise<ScheduleApp[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('event_id', eventId)
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('Error fetching schedules:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  // Transform DB records to app format
  return data.map((record) => ScheduleDbToAppSchema.parse(record));
}

// Removed getExistingMessageTypes - no longer needed since message_type field doesn't exist in schedules table
// Use template_id instead for deduplication in createDefaultSchedules action
