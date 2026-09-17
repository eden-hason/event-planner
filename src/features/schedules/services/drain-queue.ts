import type { SupabaseClient } from '@supabase/supabase-js';
import { postWhatsAppTemplate } from './post-whatsapp';
import { sendSmsMessage } from '../actions/sms';
import { createGovernor } from '../utils/governor';
import { isTransient, nextRetryDelayMinutes } from '../utils/whatsapp-failures';
import { parseSendPayload, type SendPayload } from '../utils/send-payload';
import { sendingConfig } from '@/lib/config/sending';

/**
 * The Worker: claims queued Deliveries across every Event and sends them at one
 * pace under a single governor.
 *
 * It knows nothing about the domain. It reads `send_payload`, posts it, and
 * records the outcome - no guests, no events, no templates, no parameter
 * resolution, no joins beyond the claim itself. That is the whole point of
 * rendering at dispatch: the Worker is a pipe with a rate limiter, and every
 * piece of Kululu's message-building logic stays on the Dispatcher's side of
 * the seam where it fails loudly and once per Schedule (ADR 0013).
 *
 * A send is claimed before it is made (ADR 0014). `claim_delivery_batch`
 * inserts a pending Delivery Attempt in the same statement that dequeues the
 * Delivery, so a crash between the claim and Meta's answer leaves an attempt
 * nobody resolved - and that guest is never written to twice. The reaper turns
 * those into System-level failures in front of an Operator.
 */

const LOCK_NAME = 'whatsapp-worker';

/** Rows per claim. Small enough that a crash strands little, large enough to be cheap. */
const CLAIM_BATCH = 50;

/** Fraction of the function's budget the drain will use before stopping cleanly. */
const TIME_BUDGET_FRACTION = 0.8;

/** Lease length. Comfortably longer than one batch, short enough to self-heal. */
const LEASE_SECONDS = 120;

export type DrainResult = {
  skipped: boolean;
  claimed: number;
  sent: number;
  failed: number;
  retrying: number;
  unknown: number;
  /** True when the drain stopped on its time budget with work still queued. */
  timedOut: boolean;
};

type ClaimedRow = {
  delivery_id: string;
  attempt_id: string;
  send_payload: unknown;
};

type SendOutcome =
  | { kind: 'sent'; messageId: string | null }
  | {
      kind: 'failed';
      message: string;
      errorCode: number | null;
      httpStatus: number;
      retryable: boolean;
    }
  | { kind: 'unknown'; message: string };

/**
 * Posts one payload. The only place the Worker touches a provider.
 *
 * `retryable` is the whole of ADR 0014's retry rule: only a rejection Meta
 * actually answered with, and only a transient one. An unknown outcome is
 * never retryable - the message may already have gone out, and there is no
 * idempotency key to ask with.
 */
async function sendPayload(payload: SendPayload): Promise<SendOutcome> {
  if (payload.channel === 'sms') {
    const result = await sendSmsMessage({ to: payload.to, body: payload.body });
    return result.success
      ? { kind: 'sent', messageId: result.messageId ?? null }
      : {
          kind: 'failed',
          message: result.message,
          errorCode: null,
          httpStatus: 0,
          retryable: false,
        };
  }

  const result = await postWhatsAppTemplate(payload);
  if (result.outcome === 'accepted') {
    return { kind: 'sent', messageId: result.messageId };
  }
  if (result.outcome === 'unknown') {
    return { kind: 'unknown', message: result.message };
  }
  return {
    kind: 'failed',
    message: result.message,
    errorCode: result.errorCode,
    httpStatus: result.httpStatus,
    retryable: isTransient(result.errorCode, result.httpStatus),
  };
}

/** How many attempts this Delivery has already had, for the backoff ladder. */
async function attemptCount(supabase: SupabaseClient, deliveryId: string): Promise<number> {
  const { count } = await supabase
    .from('message_delivery_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('delivery_id', deliveryId);
  return count ?? 0;
}

export async function drainQueue(
  supabase: SupabaseClient,
  options: { maxDurationMs: number },
): Promise<DrainResult> {
  const config = sendingConfig();
  const result: DrainResult = {
    skipped: false,
    claimed: 0,
    sent: 0,
    failed: 0,
    retrying: 0,
    unknown: 0,
    timedOut: false,
  };

  // One Worker at a time. Concurrency was rejected outright (ADR 0013): one
  // worker at 50 MPS drains the largest Event in seven seconds, so parallelism
  // buys nothing and costs the only genuinely hard thing - a single pace under
  // an account-wide throughput budget.
  const { data: acquired, error: lockError } = await supabase.rpc('acquire_pipeline_lock', {
    p_name: LOCK_NAME,
    p_lease_seconds: LEASE_SECONDS,
  });
  if (lockError) {
    console.error('[worker] Could not take the lease:', lockError);
    return { ...result, skipped: true };
  }
  if (acquired !== true) {
    // Expected and healthy: the crons overlap by design, and the lease is what
    // keeps one Worker at one pace. Logged so a run that did nothing is still
    // distinguishable from a run that never happened.
    console.log('[worker] Another worker holds the lease, skipping');
    return { ...result, skipped: true };
  }

  const governor = createGovernor({
    maxPerSecond: config.whatsAppMaxPerSecond,
    maxInFlight: config.whatsAppMaxInFlight,
  });

  const deadline = Date.now() + options.maxDurationMs * TIME_BUDGET_FRACTION;

  try {
    while (Date.now() < deadline) {
      const { data, error } = await supabase.rpc('claim_delivery_batch', {
        p_limit: CLAIM_BATCH,
      });
      if (error) {
        console.error('[worker] Claim failed:', error);
        break;
      }

      const batch = (data ?? []) as ClaimedRow[];
      if (batch.length === 0) break;
      result.claimed += batch.length;
      console.log(`[worker] Claimed ${batch.length} delivery(ies)`);

      await Promise.all(
        batch.map((row) =>
          governor.run(async () => {
            const payload = parseSendPayload(row.send_payload);

            if (!payload) {
              // The Dispatcher wrote something this build cannot read. The
              // attempt is already claimed, so it has to be resolved - as a
              // failure with no code, which is System-level and so stays out of
              // the automatic SMS batch.
              await resolveAttempt(supabase, row, {
                kind: 'failed',
                message: 'Send payload could not be read',
                errorCode: null,
                httpStatus: 0,
                retryable: false,
              });
              result.failed += 1;
              return;
            }

            const outcome = await sendPayload(payload);

            if (outcome.kind === 'failed' && outcome.retryable) {
              const delay = nextRetryDelayMinutes(await attemptCount(supabase, row.delivery_id));
              if (delay !== null) {
                // Back off the whole pipe, not just this guest: a 429 is the
                // account's budget answering, and every other message in flight
                // is competing for the same budget. Triggered on the HTTP status
                // as well as the Meta code - a 429 carrying a code we do not
                // recognise is still Meta telling us to slow down.
                if (
                  outcome.httpStatus === 429 ||
                  outcome.errorCode === 130429 ||
                  outcome.errorCode === 131056
                ) {
                  governor.halve();
                }
                await resolveAttempt(supabase, row, outcome, delay);
                result.retrying += 1;
                return;
              }
            }

            await resolveAttempt(supabase, row, outcome);
            if (outcome.kind === 'sent') result.sent += 1;
            else if (outcome.kind === 'unknown') result.unknown += 1;
            else result.failed += 1;
          }),
        ),
      );

      await supabase.rpc('extend_pipeline_lock', {
        p_name: LOCK_NAME,
        p_lease_seconds: LEASE_SECONDS,
      });

      if (batch.length < CLAIM_BATCH) break; // the queue is drained
    }

    if (Date.now() >= deadline) {
      const { count } = await supabase
        .from('message_deliveries')
        .select('id', { count: 'exact', head: true })
        .not('next_attempt_at', 'is', null);
      result.timedOut = (count ?? 0) > 0;
    }
  } finally {
    // Releasing on the way out is the fast path; the lease expiring is the
    // backstop when this process does not get to run its finally block at all.
    await supabase.rpc('release_pipeline_lock', { p_name: LOCK_NAME });
  }

  // Always, including the empty drain: this line is how the Worker proves it
  // ran. `unknown` is called out separately from `failed` because it is the one
  // number that means a guest may have been written to without us knowing.
  console.log(
    `[worker] Done: claimed ${result.claimed}, sent ${result.sent}, ` +
      `failed ${result.failed}, retrying ${result.retrying}, unknown ${result.unknown}` +
      (result.timedOut ? ' (stopped on time budget, queue not empty)' : '') +
      ` at ${governor.ratePerSecond}/s`,
  );

  return result;
}

/**
 * Writes the outcome to the claimed attempt, and re-queues the Delivery when a
 * retry is earned.
 *
 * `send_payload` is nulled on every terminal outcome: it carries the Guest's
 * phone number and name and exists only while a Delivery is in flight. A retry
 * keeps it, because a retry resends byte-identical bytes.
 */
async function resolveAttempt(
  supabase: SupabaseClient,
  row: ClaimedRow,
  outcome: SendOutcome,
  retryInMinutes?: number,
): Promise<void> {
  const now = new Date();

  const attemptUpdate =
    outcome.kind === 'sent'
      ? {
          status: 'sent' as const,
          sent_at: now.toISOString(),
          external_message_id: outcome.messageId,
        }
      : {
          status: 'failed' as const,
          error_message: outcome.message,
          // An unknown outcome carries no code on purpose: classifyWhatsAppFailure
          // reads a null code as System-level, which keeps a send that may
          // already have gone out away from an automatic SMS to the same guest.
          error_code: outcome.kind === 'failed' ? outcome.errorCode : null,
        };

  const { error: attemptError } = await supabase
    .from('message_delivery_attempts')
    .update(attemptUpdate)
    .eq('id', row.attempt_id);
  if (attemptError) {
    console.error('[worker] Could not resolve attempt', row.attempt_id, attemptError);
  }

  const deliveryUpdate =
    retryInMinutes != null
      ? { next_attempt_at: new Date(now.getTime() + retryInMinutes * 60_000).toISOString() }
      : { send_payload: null };

  const { error: deliveryError } = await supabase
    .from('message_deliveries')
    .update(deliveryUpdate)
    .eq('id', row.delivery_id);
  if (deliveryError) {
    console.error('[worker] Could not update delivery', row.delivery_id, deliveryError);
  }
}
