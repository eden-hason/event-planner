import { createClient } from '@/lib/supabase/server';
import { GiftDbToAppTransformerSchema } from '../schemas/gifts';
import type { GiftApp } from '../schemas/gifts';

export async function getEventGifts(eventId: string): Promise<GiftApp[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching gifts:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    const result: GiftApp[] = [];
    for (const row of data) {
      try {
        result.push(GiftDbToAppTransformerSchema.parse(row));
      } catch (err) {
        console.error('Failed to parse gift:', err, row);
      }
    }
    return result;
  } catch (error) {
    console.error('Error fetching gifts:', error);
    return [];
  }
}
