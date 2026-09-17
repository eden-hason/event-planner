import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sweepWebhookInbox } from '@/features/schedules/services/sweep-webhook-inbox';
import { reapStrandedAttempts } from '@/features/schedules/services/reap-stranded-attempts';
import { sweepSmsFallback } from '@/features/schedules/services/sweep-sms-fallback';
import { isAuthorizedCron } from '@/lib/config/sending';

/**
 * The Sweeper, every five minutes.
 *
 * Three passes, in this order, because each depends on the one before:
 *
 *   1. process stored webhook notifications, so a Delivery's real outcome is
 *      known before anything judges it
 *   2. reap attempts nobody ever resolved, so a stranded send counts as failed
 *      rather than as still in flight
 *   3. hand settled Schedules to the SMS Fallback, which reads both of the above
 *
 * Running them out of order would have the Fallback deciding on a Schedule
 * whose failures had not landed yet.
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const webhooks = await sweepWebhookInbox(supabase);
  const reaped = await reapStrandedAttempts(supabase);
  const fallback = await sweepSmsFallback(supabase);

  console.log(
    `[sweep] Done: ${webhooks.processed}/${webhooks.picked} webhook(s) processed, ` +
      `${reaped.reaped} attempt(s) reaped, ` +
      `${fallback.considered} schedule(s) considered for SMS fallback, ${fallback.sent} sent`,
  );

  return NextResponse.json({ success: true, webhooks, reaped, fallback });
}
