'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';

export type AssignGuestState = {
  success: boolean;
  message?: string | null;
};

export async function assignGuestToTable(
  eventId: string,
  guestId: string,
  tableId: string | null,
): Promise<AssignGuestState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'You must be logged in' };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('guests')
      .update({ table_id: tableId })
      .eq('id', guestId);

    if (error) {
      console.error('Assign guest error:', error);
      return { success: false, message: 'Could not assign guest' };
    }

    revalidatePath(`/app/${eventId}/seating`);
    return { success: true, message: tableId ? 'Guest seated' : 'Guest unseated' };
  } catch (error) {
    console.error('Assign guest error:', error);
    return { success: false, message: 'Failed to assign guest' };
  }
}
