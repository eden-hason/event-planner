import { getEffectiveClient } from '@/lib/supabase/admin';
import {
  DefaultScheduleDbToAppSchema,
  type DefaultScheduleApp,
} from '../schemas/catalog';

/**
 * Fetches the pre-defined default schedules for an event type (by key),
 * with the schedule type key and full message template joined in.
 * Used to seed the schedule setup wizard suggestions.
 */
export async function getDefaultSchedulesForEventType(
  eventTypeKey: string,
): Promise<DefaultScheduleApp[]> {
  const { supabase } = await getEffectiveClient();

  const { data, error } = await supabase
    .from('event_type_default_schedules')
    .select(
      '*, event_types!inner (key), schedule_types (key, name), message_templates (*)',
    )
    .eq('event_types.key', eventTypeKey)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching default schedules:', error);
    return [];
  }

  return (data ?? []).map((row) => DefaultScheduleDbToAppSchema.parse(row));
}
