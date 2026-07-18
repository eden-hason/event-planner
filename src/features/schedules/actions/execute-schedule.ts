'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveClient } from '@/lib/supabase/admin';
import { sendSchedule } from '../services/send-schedule';

/**
 * Execution result summary.
 */
export interface ExecuteScheduleSummary {
  scheduleId: string;
  totalGuests: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
}

/**
 * Result of schedule execution.
 */
export interface ExecuteScheduleResult {
  success: boolean;
  message: string;
  summary?: ExecuteScheduleSummary;
}

/**
 * Manually executes a schedule for the current user (send-now button / API).
 * Thin wrapper around the shared send engine; RLS scopes data access.
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

    const outcome = await sendSchedule(scheduleId, {
      supabase,
      triggeredBy: 'manual',
      claim: 'precheck',
    });

    revalidatePath('/app');

    return {
      success: outcome.success,
      message: outcome.message,
      summary: {
        scheduleId: outcome.scheduleId,
        totalGuests: outcome.totalGuests,
        sentCount: outcome.sentCount,
        failedCount: outcome.failedCount,
        skippedCount: outcome.skippedCount,
      },
    };
  } catch (error) {
    console.error('Error executing schedule:', error);
    return { success: false, message: 'Failed to execute schedule' };
  }
}
