import type { SupabaseClient } from '@supabase/supabase-js';
import { sendingConfig } from '@/lib/config/sending';

/**
 * Ages out Delivery Attempts that were claimed and never resolved.
 *
 * At-most-once means the Worker writes a `pending` attempt *before* it calls
 * WhatsApp (ADR 0014). A crash in that gap - Vercel killing the function at
 * maxDuration, a deploy tearing down the instance - leaves an attempt nobody
 * ever resolved. It is the deliberate cost of never sending a guest the same
 * wedding invitation twice, and it is only acceptable because it is visible.
 *
 * This is what makes it visible. A pending attempt older than the reaper window
 * becomes `failed` with **no error code**, which is load-bearing in two ways:
 *
 *   - `classifyWhatsAppFailure(null)` is System-level, so a stranded send stays
 *     out of the automatic SMS Fallback. The message may already have gone out,
 *     and sending a paid SMS to a guest who already has the WhatsApp is the one
 *     outcome worth more than the delay.
 *   - it needs no new status and no new enum value: the Failed Delivery Signal
 *     the Back Office already renders picks it up unchanged.
 */

const LIMIT = 500;

export type ReapResult = { reaped: number };

export async function reapStrandedAttempts(
  supabase: SupabaseClient,
): Promise<ReapResult> {
  const { attemptReaperMinutes } = sendingConfig();
  const cutoff = new Date(Date.now() - attemptReaperMinutes * 60_000).toISOString();

  const { data, error } = await supabase
    .from('message_delivery_attempts')
    .select('id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .limit(LIMIT);

  if (error) {
    console.error('[reaper] Could not find stranded attempts:', error);
    return { reaped: 0 };
  }
  const ids = (data ?? []).map((row: { id: string }) => row.id);
  if (ids.length === 0) return { reaped: 0 };

  const { error: updateError } = await supabase
    .from('message_delivery_attempts')
    .update({
      status: 'failed',
      error_code: null,
      error_message:
        'No answer from the provider - the send may or may not have gone out. Check with the guest before resending.',
    })
    .in('id', ids)
    // Re-checked in the write: a Worker that came back to life between the
    // select and here has resolved its own attempt, and its answer is the true
    // one.
    .eq('status', 'pending');

  if (updateError) {
    console.error('[reaper] Could not reap stranded attempts:', updateError);
    return { reaped: 0 };
  }

  // The payload is no longer needed and carries the guest's phone number.
  const { data: deliveries } = await supabase
    .from('message_delivery_attempts')
    .select('delivery_id')
    .in('id', ids);
  const deliveryIds = [...new Set((deliveries ?? []).map((r: { delivery_id: string }) => r.delivery_id))];
  if (deliveryIds.length > 0) {
    await supabase
      .from('message_deliveries')
      .update({ send_payload: null })
      .in('id', deliveryIds)
      .is('next_attempt_at', null);
  }

  console.warn(`[reaper] Reaped ${ids.length} stranded attempt(s)`);
  return { reaped: ids.length };
}
