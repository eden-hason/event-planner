'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import { applyBillingTransition } from '../services';
import { SetEventBillingStatusSchema } from '../schemas';
import type { SetEventBillingStatusResult } from '../types';

/**
 * Moves an event between billing statuses by hand from the Back Office.
 *
 * This is the manual half of "Free to Plan, Pay to Send": until the external
 * payment service is wired in, an operator sets `comped` (granted), `canceled`
 * (revoked), `payment_pending` (payment started elsewhere), or back to `free`.
 * A confirmed `paid` transition only ever comes from a real payment, so it is
 * not offered here.
 *
 * `can_create_schedules` follows automatically - it is generated from the
 * status in the database.
 */
export async function setEventBillingStatus(
  input: unknown,
): Promise<SetEventBillingStatusResult> {
  const operatorId = await assertAdmin();

  const parsed = SetEventBillingStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { eventId, toStatus, note } = parsed.data;

  const supabase = createServiceClient();

  const { data: event, error: readError } = await supabase
    .from('events')
    .select('status, billing_status')
    .eq('id', eventId)
    .maybeSingle();
  if (readError) {
    console.error('setEventBillingStatus read failed:', readError);
    return { success: false, message: 'Could not load that event' };
  }
  if (!event) return { success: false, message: 'That event no longer exists' };
  if (event.status === 'draft') {
    return { success: false, message: 'A draft event has no workspace to enable sending for' };
  }
  if (event.billing_status === toStatus) {
    return { success: true, message: 'Already set' };
  }

  const result = await applyBillingTransition(supabase, {
    eventId,
    toStatus,
    provider: 'manual',
    note,
    createdBy: operatorId,
  });
  if (!result.ok) return { success: false, message: result.message };

  revalidateOutreach(eventId);
  return { success: true, message: 'Billing status updated' };
}
