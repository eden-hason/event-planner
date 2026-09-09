import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventBillingStatus } from '../types';

export type BillingTransitionInput = {
  eventId: string;
  toStatus: EventBillingStatus;
  /** `'manual'` for an operator decision, or the payment provider's name. */
  provider?: string;
  /**
   * The provider's own id for this payment. When set, the transition is
   * idempotent: a repeat call with the same provider + ref is a no-op. Leave
   * unset for manual transitions.
   */
  providerRef?: string;
  amount?: number;
  currency?: string;
  channel?: 'whatsapp' | 'sms';
  recordCount?: number;
  note?: string;
  /** The operator who made a manual transition; null for a webhook. */
  createdBy?: string;
  /** When the underlying event happened (payment time), if not now. */
  occurredAt?: string;
};

export type BillingTransitionResult =
  | { ok: true; billingEventId: string }
  | { ok: false; message: string };

/**
 * The single write path for `events.billing_status`. Advances the status and
 * appends the matching `event_billing_events` row in one transaction, via the
 * `apply_event_billing_transition` database function.
 *
 * Lives in `services/` because both entry points - the Back Office Server Action
 * and the (future) payment webhook route - go through it, and it takes its
 * client as a parameter so it never constructs one. It does NOT authorize the
 * caller: the action calls `assertAdmin` first, the webhook verifies its
 * signature first.
 */
export async function applyBillingTransition(
  supabase: SupabaseClient,
  input: BillingTransitionInput,
): Promise<BillingTransitionResult> {
  const { data, error } = await supabase.rpc('apply_event_billing_transition', {
    p_event_id: input.eventId,
    p_to_status: input.toStatus,
    p_provider: input.provider ?? 'manual',
    p_provider_ref: input.providerRef ?? null,
    p_amount: input.amount ?? null,
    p_currency: input.currency ?? 'ILS',
    p_channel: input.channel ?? null,
    p_record_count: input.recordCount ?? null,
    p_note: input.note ?? null,
    p_created_by: input.createdBy ?? null,
    p_occurred_at: input.occurredAt ?? new Date().toISOString(),
  });

  const row = (Array.isArray(data) ? data[0] : data) as { id: string } | null;

  if (error || !row) {
    console.error('applyBillingTransition failed:', error);
    return { ok: false, message: 'Could not update the billing status' };
  }

  return { ok: true, billingEventId: row.id };
}
