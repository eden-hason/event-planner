import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BillingPaymentKind,
  BillingPaymentMethod,
  EventPayment,
  RecordPackageChannel,
} from '../types';

/**
 * Every payment on an Event, newest first: the Plan and its upsales (ADR 0045). A payment is
 * a billing log row with a kind; the database guarantees each kind carries its own fields.
 * Callers that count the package keep only `isRecordsPayment`.
 * Takes its client as a parameter; RLS or the caller decides who may read it.
 */
export async function listEventPayments(
  supabase: SupabaseClient,
  eventId: string,
): Promise<EventPayment[] | null> {
  const { data, error } = await supabase
    .from('event_billing_events')
    .select('id, kind, record_count, schedule_count, channel, amount, payment_method, provider_ref, note, created_by, occurred_at')
    .eq('event_id', eventId)
    .not('kind', 'is', null)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listEventPayments failed:', error);
    return null;
  }

  return (data ?? []).map((row) => {
    const facts = {
      id: row.id as string,
      amount: Number(row.amount),
      method: row.payment_method as BillingPaymentMethod,
      reference: (row.provider_ref as string | null) ?? null,
      note: (row.note as string | null) ?? null,
      createdBy: (row.created_by as string | null) ?? null,
      occurredAt: row.occurred_at as string,
    };
    const kind = row.kind as BillingPaymentKind;
    return kind === 'extra_schedule'
      ? { ...facts, kind, schedules: row.schedule_count as number }
      : {
          ...facts,
          kind,
          records: row.record_count as number,
          channel: row.channel as RecordPackageChannel,
        };
  });
}
