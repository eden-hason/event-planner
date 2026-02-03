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

/**
 * Fetches existing message types for an event.
 * Used for idempotency checks when creating default schedules.
 *
 * @param eventId - The event ID to check
 * @returns Array of existing message types
 */
export async function getExistingMessageTypes(
  eventId: string,
): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('schedules')
    .select('message_type')
    .eq('event_id', eventId);

  if (error) {
    console.error('Error fetching existing message types:', error);
    return [];
  }

  return data?.map((row) => row.message_type) ?? [];
}
