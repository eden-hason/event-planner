'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { sendSchedule } from '@/features/schedules/services/send-schedule';

export type TriggerScheduleResult = {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
};

/**
 * Admin-triggered execution of any schedule (service role client).
 * Thin wrapper around the shared send engine.
 */
export async function triggerScheduleAdmin(scheduleId: string): Promise<TriggerScheduleResult> {
  const tag = `[trigger-schedule-admin] schedule=${scheduleId}`;
  console.log(`${tag} start`);

  try {
    await assertAdmin();
    const supabase = createServiceClient();

    const outcome = await sendSchedule(scheduleId, {
      supabase,
      triggeredBy: 'manual',
      claim: 'precheck',
    });

    revalidatePath('/app');
    if (outcome.eventId) {
      revalidatePath(`/admin/events/${outcome.eventId}`);
    }

    const message = outcome.success
      ? `Sent ${outcome.sentCount} message${outcome.sentCount !== 1 ? 's' : ''}${outcome.failedCount > 0 ? `, ${outcome.failedCount} failed` : ''}`
      : outcome.message;

    console.log(`${tag} done`, message);

    return {
      success: outcome.success,
      message,
      sentCount: outcome.sentCount,
      failedCount: outcome.failedCount,
    };
  } catch (error) {
    console.error(`${tag} unexpected error`, error);
    return { success: false, message: 'Failed to trigger schedule' };
  }
}
