import { getEffectiveClient } from '@/lib/supabase/admin';

export async function getCollaboratorCount(eventId: string): Promise<number> {
  const { supabase } = await getEffectiveClient();
  const { count } = await supabase
    .from('event_collaborators')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);
  return count ?? 0;
}
