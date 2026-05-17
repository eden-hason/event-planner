import { getEffectiveClient } from '@/lib/supabase/admin';

export async function getPendingSchedulesCount(eventId: string): Promise<number> {
  const { supabase } = await getEffectiveClient();

  const { count, error } = await supabase
    .from('schedules')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .is('status', null);

  if (error) {
    console.error('Error fetching pending schedules count:', error);
    return 0;
  }

  return count ?? 0;
}
