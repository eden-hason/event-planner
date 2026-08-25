'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';

export type AdminEventActionResult = { success: boolean; message: string };

/**
 * Opens the sending gate on an event. Until this flag is on, the event can hold
 * no schedules at all - the owner app hides outreach and every send path
 * refuses - so this is the one switch that turns a paid-for event into a
 * workable one.
 *
 * A Draft Event is deliberately refused: it is interest, not an event, and it
 * has no guest list or workspace for outreach to act on.
 */
export async function enableScheduleSending(eventId: string): Promise<AdminEventActionResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    const { data: event, error: readError } = await supabase
      .from('events')
      .select('status, can_create_schedules')
      .eq('id', eventId)
      .maybeSingle();
    if (readError) throw readError;

    if (!event) return { success: false, message: 'That event no longer exists' };
    if (event.status !== 'published') return { success: false, message: 'That event is not published' };
    if (event.can_create_schedules) return { success: true, message: 'Sending is already enabled' };

    const { error } = await supabase
      .from('events')
      .update({ can_create_schedules: true })
      .eq('id', eventId);
    if (error) throw error;

    revalidateOutreach(eventId);
    return { success: true, message: 'Sending enabled' };
  } catch (error) {
    console.error('enableScheduleSending failed:', error);
    return { success: false, message: 'Failed to enable sending' };
  }
}
