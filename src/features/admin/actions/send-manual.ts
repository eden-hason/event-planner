'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { sendSchedule } from '@/features/schedules/services/send-schedule';

export type ManualSendResult = {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
};

/**
 * Admin manual send: delivers a schedule's message to explicitly selected
 * guests, without claiming the schedule or marking it as sent.
 */
export async function sendManualMessages(
  scheduleId: string,
  guestIds: string[],
): Promise<ManualSendResult> {
  if (guestIds.length === 0) {
    return { success: false, message: 'No guests selected' };
  }

  const tag = `[manual-send] schedule=${scheduleId} guests=${guestIds.length}`;
  console.log(`${tag} start`);

  try {
    await assertAdmin();
    const supabase = createServiceClient();

    const outcome = await sendSchedule(scheduleId, {
      supabase,
      triggeredBy: 'manual',
      claim: 'none',
      guestIds,
      markSentOnSuccess: false,
    });

    revalidatePath('/app');

    const message = outcome.success
      ? `Sent ${outcome.sentCount} message${outcome.sentCount !== 1 ? 's' : ''}${outcome.failedCount > 0 ? `, ${outcome.failedCount} failed` : ''}`
      : outcome.message === 'No guests with valid phone numbers'
        ? 'None of the selected guests have a valid phone number'
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
    return { success: false, message: 'Failed to send messages' };
  }
}
