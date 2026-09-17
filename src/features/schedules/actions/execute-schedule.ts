'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveClient } from '@/lib/supabase/admin';
import { dispatchScheduleById } from '../services/dispatch-schedules';
import { nudgeWorker } from '../services/nudge-worker';

/**
 * Result of an Owner's send-now.
 *
 * There is no sent count any more, and that is the honest shape rather than a
 * regression. Sending is a queue drained by a Worker (ADR 0013), so at the
 * moment this action returns nothing has been sent yet - `queuedCount` is a
 * promise that N messages are on their way, and the per-guest outcomes arrive
 * afterwards on the Schedule's own page.
 */
export interface ExecuteScheduleResult {
  success: boolean;
  message: string;
  queuedCount?: number;
  /** Set when the Send Window held it, so the UI can say when it will go. */
  heldReason?: string;
}

/**
 * Send now: move the Due Time to this moment and hand the Schedule to the
 * Dispatcher.
 *
 * Deliberately the same path as the cron rather than a shortcut around it. The
 * old engine had seven callers each invoking the send directly, which is what
 * made the throughput governor impossible to enforce and what this replaces.
 */
export async function executeSchedule(
  scheduleId: string,
): Promise<ExecuteScheduleResult> {
  try {
    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return { success: false, message: 'Unauthorized' };
    }

    const { supabase } = await getEffectiveClient();
    const now = new Date();

    // The Due Time is the request, so "send now" is a request for now. Writing
    // it means the Schedule is due on its own terms - if this dispatch is held
    // or interrupted, the ordinary sweep picks it up rather than it being
    // stranded in a state only this action understands.
    const { error: updateError } = await supabase
      .from('schedules')
      .update({ scheduled_date: now.toISOString() })
      .eq('id', scheduleId)
      .is('status', null);

    if (updateError) {
      return { success: false, message: 'Could not move the schedule to now' };
    }

    const result = await dispatchScheduleById(supabase, scheduleId, { now });
    revalidatePath('/app');

    if (result.outcome === 'dispatched') {
      await nudgeWorker();
      const count = result.deliveriesQueued;
      return {
        success: true,
        message: `Sending to ${count} ${count === 1 ? 'guest' : 'guests'}`,
        queuedCount: count,
      };
    }

    if (result.outcome === 'held') {
      return {
        success: true,
        message: 'Queued - it will send when the sending window opens',
        heldReason: result.reason ?? undefined,
        queuedCount: 0,
      };
    }

    return { success: false, message: result.reason ?? 'Could not send this schedule' };
  } catch (error) {
    console.error('Error executing schedule:', error);
    return { success: false, message: 'Failed to execute schedule' };
  }
}
