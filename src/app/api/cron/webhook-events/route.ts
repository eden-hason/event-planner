import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  purgeExpiredWebhookEvents,
  sweepUnprocessedWebhookEvents,
} from '@/lib/webhooks/inbox';
import { processWhatsAppWebhookEvent } from '@/features/schedules/services/process-whatsapp-webhook';

export const maxDuration = 60;

/**
 * Daily housekeeping for the webhook inbox. Retries rows a quiet period left
 * unprocessed - the webhook itself retries within minutes while notifications
 * keep arriving - and purges rows past retention, since payloads carry guest
 * phone numbers. Daily because the Vercel plan allows nothing more frequent.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const swept = await sweepUnprocessedWebhookEvents(supabase, {
    provider: 'whatsapp',
    processor: processWhatsAppWebhookEvent,
    olderThanMs: 5 * 60 * 1000,
    limit: 500,
  });
  const purged = await purgeExpiredWebhookEvents(supabase);

  console.log(
    `[webhook-events-cron] Retried ${swept.picked} event(s), ${swept.processed} processed, ${purged} purged`,
  );

  return NextResponse.json({ success: true, ...swept, purged });
}
