import { NextResponse, after } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { dispatchDueSchedules } from '@/features/schedules/services/dispatch-schedules';
import { nudgeWorker } from '@/features/schedules/services/nudge-worker';
import { isAuthorizedCron } from '@/lib/config/sending';

/**
 * The Dispatcher, once a minute.
 *
 * Finds Schedules whose Due Time has come and queues a rendered Delivery per
 * Guest. Nothing here talks to WhatsApp; that is the Worker's job.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const summary = await dispatchDueSchedules(supabase);

  // Nudge the Worker so a Schedule dispatched at :00 does not wait for the
  // next minute boundary. Fire-and-forget after the response: the Worker is on
  // its own cron too, so a failed nudge costs at most sixty seconds.
  if (summary.deliveriesQueued > 0) {
    after(nudgeWorker);
  }

  return NextResponse.json({ success: true, ...summary });
}
