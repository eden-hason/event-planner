import { getEffectiveClient } from '@/lib/supabase/admin';

/**
 * Outstanding Schedules that will go out on their own: armed and dated. An
 * Undated Schedule is outstanding too, but nothing is scheduled until the Owner
 * dates it (ADR 0029), so counting it as "scheduled" would promise a send.
 */
export async function getPendingSchedulesCount(eventId: string): Promise<number> {
  const { supabase } = await getEffectiveClient();

  const { count, error } = await supabase
    .from('schedules')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .is('status', null)
    .not('scheduled_date', 'is', null);

  if (error) {
    console.error('Error fetching pending schedules count:', error);
    return 0;
  }

  return count ?? 0;
}
