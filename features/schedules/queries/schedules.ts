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
 * Fetches a single schedule by ID with its related event data.
 * RLS policies automatically verify ownership.
 *
 * @param scheduleId - The schedule ID to fetch
 * @returns Schedule with event data, or null if not found
 */
export async function getScheduleById(
  scheduleId: string,
): Promise<
  | (ScheduleApp & {
    event: {
      id: string;
      userId: string;
      title: string;
      eventDate: string;
      location?: { name: string; coords?: { lat: number; lng: number } } | null;
      hostDetails?: Record<string, unknown> | null;
      invitations?: { frontImageUrl?: string; backImageUrl?: string } | null;
    };
  })
  | null
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('schedules')
    .select(
      `
      *,
      events (
        id,
        user_id,
        title,
        event_date,
        location,
        host_details,
        invitations
      )
    `,
    )
    .eq('id', scheduleId)
    .single();

  if (error) {
    console.error('Error fetching schedule:', error);
    return null;
  }

  if (!data || !data.events) {
    return null;
  }

  // Transform schedule to app format
  const schedule = ScheduleDbToAppSchema.parse(data);

  // Transform event data to app format
  const event = {
    id: data.events.id,
    userId: data.events.user_id,
    title: data.events.title,
    eventDate: data.events.event_date,
    location: data.events.location ?? undefined,
    hostDetails: data.events.host_details ?? undefined,
    invitations: data.events.invitations
      ? {
          frontImageUrl: data.events.invitations.front_image_url,
          backImageUrl: data.events.invitations.back_image_url,
        }
      : undefined,
  };

  return {
    ...schedule,
    event,
  };
}

// Removed getExistingMessageTypes - no longer needed since message_type field doesn't exist in schedules table
// Use template_id instead for deduplication in createDefaultSchedules action
