'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';
import { toSeatingFailure, type SeatingFailure } from './errors';

export type AssignGuestsState = {
  success: boolean;
  failure?: SeatingFailure;
  assigned?: number;
};

/**
 * The single assignment operation. The Assign picker, the bulk "Assign
 * selected" bar, drag-and-drop onto a Table, and the Guest Directory's Table
 * field all come through here, so they cannot drift apart in what they allow.
 *
 * All or nothing: the whole selection fits the destination, or none of it
 * moves. That is decided inside Postgres, which locks the Table row and
 * validates against its *total* occupancy - including assignments the caller
 * cannot see - then reports the party size, places left and shortfall so the
 * refusal can explain itself (ADR-0008).
 *
 * Passing a null `tableId` unassigns.
 */
export async function assignGuestsToTable(
  eventId: string,
  guestIds: string[],
  tableId: string | null,
): Promise<AssignGuestsState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, failure: { kind: 'unknown' } };

  if (guestIds.length === 0) {
    return { success: false, failure: { kind: 'nothingAssignable' } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('assign_guests_to_table', {
    p_event_id: eventId,
    p_guest_ids: guestIds,
    p_table_id: tableId,
  });

  if (error) {
    return { success: false, failure: toSeatingFailure(error) };
  }

  revalidatePath(`/app/${eventId}/seating`);
  revalidatePath(`/app/${eventId}/guests`);

  return { success: true, assigned: typeof data === 'number' ? data : guestIds.length };
}
