'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { bonusRecords } from '@/features/billing/utils';
import { listEventPayments, loadRecordPackage } from '@/features/billing/services';
import type { EventBillingStatus } from '@/features/billing';
import type { EventRecordPackageView } from '../types';

/** The Record Package band: the same numbers the Owner sees, plus who recorded each payment. */
export async function getEventRecordPackage(eventId: string): Promise<EventRecordPackageView | null> {
  await assertAdmin();
  const supabase = createServiceClient();

  const [eventRes, loaded, payments] = await Promise.all([
    supabase.from('events').select('billing_status').eq('id', eventId).maybeSingle(),
    loadRecordPackage(supabase, eventId),
    listEventPayments(supabase, eventId),
  ]);
  if (eventRes.error) throw new Error(eventRes.error.message);
  if (!eventRes.data) return null;
  if (!loaded || !payments) throw new Error('Could not load the record package');

  const operatorIds = [...new Set(payments.flatMap((p) => (p.createdBy ? [p.createdBy] : [])))];
  const { data: operators, error } = operatorIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', operatorIds)
    : { data: [], error: null };
  if (error) throw new Error(error.message);
  const names = new Map((operators ?? []).map((o) => [o.id as string, (o.email || o.full_name) as string | null]));

  return {
    billingStatus: eventRes.data.billing_status as EventBillingStatus,
    package: loaded.package,
    automaticBonus: bonusRecords(loaded.package?.paid ?? 0),
    used: loaded.split.used,
    uncounted: loaded.split.uncounted,
    left: loaded.split.left,
    over: loaded.split.over,
    channel: payments[0]?.channel ?? null,
    payments: payments.map((p) => ({
      ...p,
      recordedBy: p.createdBy ? (names.get(p.createdBy) ?? null) : null,
    })),
  };
}
