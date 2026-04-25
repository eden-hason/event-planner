import { createClient } from '@/lib/supabase/server';
import { ExpenseDbToAppTransformerSchema } from '../schemas/expenses';
import type { ExpenseApp } from '../schemas/expenses';

export async function getEventExpenses(eventId: string): Promise<ExpenseApp[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    const result: ExpenseApp[] = [];
    for (const row of data) {
      try {
        result.push(ExpenseDbToAppTransformerSchema.parse(row));
      } catch (err) {
        console.error('Failed to parse expense:', err, row);
      }
    }
    return result;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
}
