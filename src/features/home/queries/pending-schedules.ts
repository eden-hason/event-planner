import { getEffectiveClient } from '@/lib/supabase/admin';

/**
 * Outstanding Schedules that will go out on their own: armed and dated. An
 * Undated Schedule is outstanding too, but nothing is scheduled until the Owner
 * dates it (ADR 0029), so counting it as "scheduled" would promise a send.
 * `messagesOnly` leaves out call plans, for an Event whose Plan has no calls
 * (ADR 0034).
 */
export async function getPendingSchedulesCount(
  eventId: string,
  { messagesOnly = false }: { messagesOnly?: boolean } = {},
): Promise<number> {
  const { supabase } = await getEffectiveClient();

  let query = supabase
    .from('schedules')
    .select('id, schedule_types!inner (execution_kind)', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .is('status', null)
    .not('scheduled_date', 'is', null);
  if (messagesOnly) query = query.eq('schedule_types.execution_kind', 'message');

  const { count, error } = await query;

  if (error) {
    console.error('Error fetching pending schedules count:', error);
    return 0;
  }

  return count ?? 0;
}
