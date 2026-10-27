'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { pageAll } from '@/lib/supabase/row-cap';
import type { BillingPaymentKind, BillingPaymentMethod } from '@/features/billing';
import type { PaymentIndexRow, PaymentsIndexFilters, PaymentsIndexPage } from '../types';
import { excludeIds, getTestScope } from './test-accounts';
import { eventTitle, UNKNOWN_OWNER } from '../utils/labels';
import { filterPaymentRows, sortPaymentRows } from '../utils/payments-index';

const PAGE_SIZE = 50;

type PaymentRow = {
  id: string;
  event_id: string;
  amount: number | string;
  payment_method: BillingPaymentMethod;
  kind: BillingPaymentKind;
  provider_ref: string | null;
  occurred_at: string;
  events: { user_id: string; title: string | null };
};

/**
 * Every recorded payment, filtered, sorted and paged here like the Events index.
 * A payment is a billing log row with a kind (ADR 0045), upsales included - the
 * same rows the Overview's Payments total adds up, so the two agree. Gifts are
 * payments of 0 and are left out for the same reason they are there.
 */
export async function getPaymentsIndex(filters: PaymentsIndexFilters): Promise<PaymentsIndexPage> {
  await assertAdmin();
  const supabase = createServiceClient();
  const test = await getTestScope();

  const payments = (await pageAll((from, to) =>
    excludeIds(
      supabase
        .from('event_billing_events')
        .select('id, event_id, amount, payment_method, kind, provider_ref, occurred_at, events!inner(user_id, title)')
        .not('kind', 'is', null)
        .neq('payment_method', 'gift'),
      'event_id',
      test.eventIds,
    )
      .order('id')
      .range(from, to),
  )) as unknown as PaymentRow[];

  // events.user_id has no foreign key to profiles, so the Owner is a second read.
  const ownerIds = [...new Set(payments.map((payment) => payment.events.user_id))];
  const { data: owners, error } = ownerIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', ownerIds)
    : { data: [], error: null };
  if (error) throw new Error(error.message);
  const ownerById = new Map((owners ?? []).map((owner) => [owner.id, owner]));

  const allRows: PaymentIndexRow[] = payments.map((payment) => {
    const owner = ownerById.get(payment.events.user_id);
    return {
      id: payment.id,
      eventId: payment.event_id,
      eventTitle: eventTitle(payment.events.title),
      ownerName: owner?.full_name?.trim() || owner?.email || UNKNOWN_OWNER,
      ownerEmail: owner?.email ?? null,
      amount: Number(payment.amount),
      method: payment.payment_method,
      kind: payment.kind,
      reference: payment.provider_ref?.trim() || null,
      occurredAt: payment.occurred_at,
    };
  });

  const visible = sortPaymentRows(filterPaymentRows(allRows, filters), filters.sort, filters.dir);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pageCount);
  const start = (page - 1) * PAGE_SIZE;
  return {
    rows: visible.slice(start, start + PAGE_SIZE),
    totalRows: visible.length,
    totalAmount: visible.reduce((sum, row) => sum + row.amount, 0),
    totalPayments: allRows.length,
    page,
    pageSize: PAGE_SIZE,
    pageCount,
  };
}
