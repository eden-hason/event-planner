import type { SupabaseClient } from '@supabase/supabase-js';
import { isFollowUpConfirmation } from '../utils/confirmation-round';

/**
 * Loads the Event's other Confirmation Schedules and decides whether this one is
 * a repeat round. Non-confirmation Schedules answer false without a query.
 *
 * A failed lookup answers false: the first-round copy is a correct message to
 * send on any round, while failing the whole send over a copy nuance is not.
 */
export async function loadIsFollowUpConfirmation(
  supabase: SupabaseClient,
  schedule: {
    id: string;
    eventId: string;
    scheduleTypeId: string;
    scheduleTypeKey: string;
    scheduledDate: string;
  },
): Promise<boolean> {
  if (schedule.scheduleTypeKey !== 'confirmation') return false;

  const { data, error } = await supabase
    .from('schedules')
    .select('id, scheduled_date, status')
    .eq('event_id', schedule.eventId)
    .eq('schedule_type_id', schedule.scheduleTypeId)
    .neq('id', schedule.id);

  if (error) {
    console.error('[confirmation-round] Could not load sibling schedules:', error);
    return false;
  }

  return isFollowUpConfirmation(
    schedule,
    (data ?? []).map((row) => ({
      id: row.id as string,
      scheduleTypeKey: 'confirmation',
      scheduledDate: row.scheduled_date as string,
      status: row.status as string | null,
    })),
  );
}
