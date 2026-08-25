'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { sendSchedule } from '../services/send-schedule';
import { revalidateOutreach } from '../services/revalidate-outreach';

export type TriggerScheduleResult = {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
};

/**
 * Back Office "Send now": push a schedule that should already have gone out.
 *
 * `claim: 'precheck'` rejects a schedule that is already sent or cancelled, and
 * the send marks it sent on success - this is the cron's job being done by
 * hand, so it leaves the same trace the cron would have.
 *
 * `skipAlreadyDelivered` is on because a `status IS NULL` schedule can still
 * carry deliveries from an earlier selective resend, and nobody should receive
 * the same message twice because an Operator rescued the rest of the list.
 */
export async function triggerScheduleAdmin(
  scheduleId: string,
): Promise<TriggerScheduleResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    const outcome = await sendSchedule(scheduleId, {
      supabase,
      triggeredBy: 'manual',
      claim: 'precheck',
      skipAlreadyDelivered: true,
    });

    revalidateOutreach(outcome.eventId);

    return {
      success: outcome.success,
      message: outcome.success
        ? `Sent to ${outcome.sentCount} ${outcome.sentCount === 1 ? 'guest record' : 'guest records'}`
        : outcome.message,
      sentCount: outcome.sentCount,
      failedCount: outcome.failedCount,
    };
  } catch (error) {
    console.error('Admin schedule trigger failed:', error);
    return { success: false, message: 'Failed to send' };
  }
}
