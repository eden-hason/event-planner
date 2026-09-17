import type { SupabaseClient } from '@supabase/supabase-js';
import { sweepUnprocessedWebhookEvents } from '@/lib/webhooks/inbox';
import { processWhatsAppWebhookEvent } from './process-whatsapp-webhook';

/**
 * Processes webhook notifications that are still sitting unprocessed.
 *
 * The inbox already retries, but only from inside the webhook handler - a
 * stuck row is picked up when the *next* notification arrives. During a send
 * that is a retry within seconds; at the end of one it is never, because the
 * last webhook of a burst has nothing after it to carry it. A failed status for
 * the final guest of a Schedule could sit unprocessed indefinitely, which is
 * precisely the guest the SMS Fallback is waiting on.
 *
 * Running it on the sweeper closes that gap without changing the handler: the
 * same function, the same processor, just no longer dependent on more traffic
 * arriving.
 */

/** Old enough that the handler's own in-request attempt has finished or failed. */
const OLDER_THAN_MS = 60_000;

const LIMIT = 200;

export async function sweepWebhookInbox(
  supabase: SupabaseClient,
): Promise<{ picked: number; processed: number }> {
  try {
    return await sweepUnprocessedWebhookEvents(supabase, {
      provider: 'whatsapp',
      processor: processWhatsAppWebhookEvent,
      olderThanMs: OLDER_THAN_MS,
      limit: LIMIT,
    });
  } catch (error) {
    console.error('[sweep] Webhook inbox sweep failed:', error);
    return { picked: 0, processed: 0 };
  }
}
