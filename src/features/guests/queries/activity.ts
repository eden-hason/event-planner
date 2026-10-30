import { getEffectiveClient } from '@/lib/supabase/admin';

const PAGE = 1000;

/**
 * Guest Records on this Event that a Delivery has reached the provider for.
 * The delete confirm names them, because their message history goes with them
 * (ADR 0025). Paged: an Event's Deliveries run to guests times Schedules.
 */
export async function getEventMessagedGuestIds(
  eventId: string,
): Promise<string[]> {
  const { supabase } = await getEffectiveClient();
  const ids = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('message_deliveries')
      .select('guest_id, guests!inner(event_id)')
      .eq('guests.event_id', eventId)
      .in('status', ['sent', 'delivered', 'read'])
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('Error fetching messaged guests:', error);
      break;
    }
    for (const row of data ?? []) ids.add(row.guest_id as string);
    if (!data || data.length < PAGE) break;
  }
  return [...ids];
}
