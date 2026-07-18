import type { SupabaseClient } from '@supabase/supabase-js';
import { sendSchedule } from '@/features/schedules/services/send-schedule';

/**
 * Result of processing all due schedules.
 */
export interface ProcessScheduledMessagesResult {
  schedulesProcessed: number;
  totalSent: number;
  totalFailed: number;
  errors: { scheduleId: string; error: string }[];
}

/**
 * Cron entry point: queries due schedules and runs each through the shared
 * send engine with an optimistic-lock claim (safe under concurrent
 * invocations) and delivery-based resume (safe after timeouts).
 */
export async function processScheduledMessages(
  supabase: SupabaseClient,
): Promise<ProcessScheduledMessagesResult> {
  const result: ProcessScheduledMessagesResult = {
    schedulesProcessed: 0,
    totalSent: 0,
    totalFailed: 0,
    errors: [],
  };

  const { data: dueSchedules, error } = await supabase
    .from('schedules')
    .select('id')
    .is('status', null)
    .lte('scheduled_date', new Date().toISOString())
    .order('scheduled_date', { ascending: true })
    .limit(10);

  if (error) {
    console.error('[cron] Error fetching due schedules:', error);
    return result;
  }

  if (!dueSchedules || dueSchedules.length === 0) {
    return result;
  }

  console.log(`[cron] Found ${dueSchedules.length} due schedule(s)`);

  // Process each schedule independently - one failure must not block others
  for (const { id } of dueSchedules) {
    try {
      const outcome = await sendSchedule(id, {
        supabase,
        triggeredBy: 'scheduled',
        claim: 'optimistic-lock',
        skipAlreadyDelivered: true,
      });

      result.schedulesProcessed++;
      result.totalSent += outcome.sentCount;
      result.totalFailed += outcome.failedCount;

      console.log(
        `[cron] Schedule ${id}: sent=${outcome.sentCount}, failed=${outcome.failedCount} (${outcome.message})`,
      );

      if (!outcome.success) {
        result.errors.push({ scheduleId: id, error: outcome.message });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[cron] Error processing schedule ${id}:`, message);
      result.errors.push({ scheduleId: id, error: message });
    }
  }

  return result;
}
