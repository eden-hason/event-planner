import { createClient } from '@/utils/supabase/server';
import { EventScheduleApp, scheduleDbToApp } from '../schemas';

export const getEventSchedules = async (
  eventId: string,
): Promise<EventScheduleApp[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('event_id', eventId);

  if (error) {
    console.error('Error fetching schedules:', error);
    return [];
  }

  return data?.map(scheduleDbToApp) ?? [];
};
