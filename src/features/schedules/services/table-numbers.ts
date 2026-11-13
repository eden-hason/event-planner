import type { SupabaseClient } from '@supabase/supabase-js';

export type TableNumber = { tableNumber: number; label: string | null };

/**
 * An Event's tables by id, for its Guests' table numbers. Takes the client
 * so the page (RLS-bound, impersonation-aware) and the Server Action read
 * them the same way.
 */
export async function loadTableNumbers(
  supabase: SupabaseClient,
  eventId: string,
): Promise<Map<string, TableNumber>> {
  const { data, error } = await supabase
    .from('tables')
    .select('id, table_number, label')
    .eq('event_id', eventId);
  if (error) throw new Error(error.message);
  return new Map(
    (data ?? []).map((row) => [row.id, { tableNumber: row.table_number, label: row.label }]),
  );
}
