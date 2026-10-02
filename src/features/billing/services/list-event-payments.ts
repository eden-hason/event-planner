import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillingPaymentMethod, EventPayment, RecordPackageChannel } from '../types';

/**
 * The payments behind an Event's Paid Records, newest first. A payment is a billing log row
 * that carries records (the database guarantees channel, amount and method come with it).
 * Takes its client as a parameter; RLS or the caller decides who may read it.
 */
export async function listEventPayments(
  supabase: SupabaseClient,
  eventId: string,
): Promise<EventPayment[] | null> {
  const { data, error } = await supabase
    .from('event_billing_events')
    .select('id, record_count, channel, amount, payment_method, provider_ref, note, created_by, occurred_at')
    .eq('event_id', eventId)
    .not('record_count', 'is', null)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listEventPayments failed:', error);
    return null;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    records: row.record_count as number,
    channel: row.channel as RecordPackageChannel,
    amount: Number(row.amount),
    method: row.payment_method as BillingPaymentMethod,
    reference: (row.provider_ref as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    occurredAt: row.occurred_at as string,
  }));
}
