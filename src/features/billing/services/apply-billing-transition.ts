import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BillingPaymentMethod,
  EventBillingStatus,
  RecordPackageChannel,
} from '../types';
import { onSale } from '../utils/pricing';
import { listEventPayments } from './list-event-payments';

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
  /** A payment sets records, channel, amount and method together, and lands on `paid`. */
  channel?: RecordPackageChannel;
  recordCount?: number;
  paymentMethod?: BillingPaymentMethod;
  note?: string;
  /** The operator who made a manual transition; null for a webhook. */
  createdBy?: string;
  /** When the underlying event happened (payment time), if not now. */
  occurredAt?: string;
};

export type BillingTransitionResult =
  | { ok: true; billingEventId: string }
  /** `otherPlan`: a Top-up on a Plan other than the package's own, refused (ADR 0042). */
  | { ok: false; message: string; reason?: 'otherPlan' };

/**
 * The single write path for `events.billing_status`. Advances the status and
 * appends the matching `event_billing_events` row in one transaction, via the
 * `apply_event_billing_transition` database function.
 *
 * Lives in `services/` because both entry points - the Back Office Server Action
 * and the (future) payment webhook route - go through it, and it takes its
 * client as a parameter so it never constructs one. It does NOT authorize the
 * caller: the action calls `assertAdmin` first, the webhook verifies its
 * signature first. It does keep a Top-up on the package's Plan (ADR 0042), so
 * every entry point holds to it.
 */
export async function applyBillingTransition(
  supabase: SupabaseClient,
  input: BillingTransitionInput,
): Promise<BillingTransitionResult> {
  if (input.recordCount != null && input.channel) {
    const payments = await listEventPayments(supabase, input.eventId);
    if (!payments) return { ok: false, message: 'Could not read the package' };
    // A package on a Plan no longer sold (SMS) may move to one that is.
    const plan = onSale(payments[0]?.channel);
    if (plan && plan !== input.channel) {
      return { ok: false, message: 'A top-up stays on the package Plan', reason: 'otherPlan' };
    }
  }

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
    p_payment_method: input.paymentMethod ?? null,
  });

  const row = (Array.isArray(data) ? data[0] : data) as { id: string } | null;

  if (error || !row) {
    console.error('applyBillingTransition failed:', error);
    return { ok: false, message: 'Could not update the billing status' };
  }

  return { ok: true, billingEventId: row.id };
}
