import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sweepWebhookInbox } from '@/features/schedules/services/sweep-webhook-inbox';
import { reapStrandedAttempts } from '@/features/schedules/services/reap-stranded-attempts';
import { sweepSmsFallback } from '@/features/schedules/services/sweep-sms-fallback';
import { queueMarketingCapRetries } from '@/features/schedules/services/queue-marketing-cap-retries';
import { purgeExpiredWhatsAppImportSessions } from '@/features/guests/services/whatsapp-import-session';
import { purgeAbandonedVisitors } from '@/features/auth/services/visitors';
import { sweepOwnerMessages } from '@/features/owner-messages/services';
import { isAuthorizedCron } from '@/lib/config/sending';

/**
 * The Sweeper, every five minutes.
 *
 * Four passes, in this order, because each depends on the one before:
 *
 *   1. process stored webhook notifications, so a Delivery's real outcome is
 *      known before anything judges it
 *   2. reap attempts nobody ever resolved, so a stranded send counts as failed
 *      rather than as still in flight
 *   3. queue the Marketing Cap Retries that have come due (ADR 0056), which
 *      read the failures the first pass landed
 *   4. hand settled Schedules to the SMS Fallback, which reads all of the above
 *      and holds back any Delivery still awaiting a Marketing Cap Retry
 *
 * Running them out of order would have the Fallback deciding on a Schedule
 * whose failures had not landed yet.
 *
 * Unrelated to the three, it also drops expired WhatsApp import sessions
 * (backlog 0017) - they hold other people's names and numbers, so a session
 * nobody came back for should not linger. And it forgets Visitors who left
 * their Draft Event untouched for 30 days (ADR 0028). And it sends the
 * automatic Owner Messages that have come due (ADR 0039).
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const webhooks = await sweepWebhookInbox(supabase);
  const reaped = await reapStrandedAttempts(supabase);
  const capRetries = await queueMarketingCapRetries(supabase);
  const fallback = await sweepSmsFallback(supabase);
  const whatsappImports = await purgeExpiredWhatsAppImportSessions(supabase);
  const visitors = await purgeAbandonedVisitors(supabase);
  const ownerMessages = await sweepOwnerMessages(supabase);

  console.log(
    `[sweep] Done: ${webhooks.processed}/${webhooks.picked} webhook(s) processed, ` +
      `${reaped.reaped} attempt(s) reaped, ` +
      `${capRetries.queued} marketing-cap retry(ies) queued, ` +
      `${fallback.considered} schedule(s) considered for SMS fallback, ${fallback.sent} sent, ` +
      `${whatsappImports.purged} expired WhatsApp import session(s) purged, ` +
      `${visitors.purged} abandoned Visitor(s) forgotten, ` +
      `${ownerMessages.sent} Owner Message(s) sent, ${ownerMessages.failed} failed, ${ownerMessages.expired} expired`,
  );

  return NextResponse.json({ success: true, webhooks, reaped, capRetries, fallback, whatsappImports, visitors, ownerMessages });
}
