import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The webhook inbox (public.webhook_events): every verified provider
 * notification is stored before it is processed, so a processing failure is a
 * row to retry rather than an event lost behind a 200 we already sent.
 *
 * Provider-agnostic on purpose - the next webhook lands in the same table with
 * its own `provider` and its own processor.
 */

export type WebhookProvider = 'whatsapp';

export type StoredWebhookEvent = {
  id: string;
  provider: WebhookProvider;
  payload: unknown;
  received_at: string;
  process_attempts: number;
};

/** Rows kept this long, then purged - payloads carry guest phone numbers. */
export const WEBHOOK_EVENT_RETENTION_DAYS = 90;

export type StoreResult =
  | { status: 'stored'; event: StoredWebhookEvent }
  | { status: 'duplicate' }
  | { status: 'error'; error: unknown };

/**
 * Stores a verified raw body. A byte-identical redelivery hashes the same and
 * is recognised as a duplicate instead of stored twice.
 */
export async function storeWebhookEvent(
  supabase: SupabaseClient,
  params: {
    provider: WebhookProvider;
    rawBody: string;
    payload: unknown;
    fields: string[];
  },
): Promise<StoreResult> {
  const payloadHash = createHash('sha256').update(params.rawBody, 'utf8').digest('hex');

  const { data, error } = await supabase
    .from('webhook_events')
    .upsert(
      {
        provider: params.provider,
        payload_hash: payloadHash,
        payload: params.payload,
        fields: params.fields,
      },
      { onConflict: 'provider,payload_hash', ignoreDuplicates: true },
    )
    .select('id, provider, payload, received_at, process_attempts');

  if (error) return { status: 'error', error };
  const row = data?.[0];
  if (!row) return { status: 'duplicate' };
  return { status: 'stored', event: row as StoredWebhookEvent };
}

export type Processor = (
  supabase: SupabaseClient,
  event: StoredWebhookEvent,
) => Promise<void>;

/**
 * Runs a processor over one stored event and records the result. A processor
 * signals "try again later" by throwing; it must be idempotent, because a row
 * can be picked up by more than one sweep.
 */
export async function processWebhookEvent(
  supabase: SupabaseClient,
  event: StoredWebhookEvent,
  processor: Processor,
): Promise<boolean> {
  try {
    await processor(supabase, event);
    await supabase
      .from('webhook_events')
      .update({
        processed_at: new Date().toISOString(),
        process_attempts: event.process_attempts + 1,
        last_error: null,
      })
      .eq('id', event.id);
    return true;
  } catch (error) {
    await supabase
      .from('webhook_events')
      .update({
        process_attempts: event.process_attempts + 1,
        last_error: error instanceof Error ? error.message : String(error),
      })
      .eq('id', event.id);
    return false;
  }
}

/**
 * Processes events still waiting after `olderThanMs`. Called opportunistically
 * by the webhook itself after each notification - during a send window Meta
 * calls every few seconds, so a failed row is retried within minutes - and by
 * the daily cron for whatever a quiet period left behind.
 */
export async function sweepUnprocessedWebhookEvents(
  supabase: SupabaseClient,
  params: {
    provider: WebhookProvider;
    processor: Processor;
    olderThanMs: number;
    limit: number;
  },
): Promise<{ picked: number; processed: number }> {
  const cutoff = new Date(Date.now() - params.olderThanMs).toISOString();
  const { data, error } = await supabase
    .from('webhook_events')
    .select('id, provider, payload, received_at, process_attempts')
    .eq('provider', params.provider)
    .is('processed_at', null)
    .lt('received_at', cutoff)
    .order('received_at', { ascending: true })
    .limit(params.limit);

  if (error) throw error;

  let processed = 0;
  for (const event of (data ?? []) as StoredWebhookEvent[]) {
    if (await processWebhookEvent(supabase, event, params.processor)) processed++;
  }
  return { picked: data?.length ?? 0, processed };
}

/** Deletes rows past the retention window. Returns how many went. */
export async function purgeExpiredWebhookEvents(
  supabase: SupabaseClient,
): Promise<number> {
  const cutoff = new Date(
    Date.now() - WEBHOOK_EVENT_RETENTION_DAYS * 86_400_000,
  ).toISOString();
  const { count, error } = await supabase
    .from('webhook_events')
    .delete({ count: 'exact' })
    .lt('received_at', cutoff);
  if (error) throw error;
  return count ?? 0;
}
