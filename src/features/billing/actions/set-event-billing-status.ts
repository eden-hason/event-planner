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
 * This is the manual half of "Free to Plan, Pay to Send": an operator sets
 * `canceled` (revoked), `payment_pending` (payment started elsewhere), or back
 * to `free`. `paid` only ever comes from a recorded payment, which also sets the
 * Record Package (ADR 0027), so it is not offered here.
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
    return { success: false, message: parsed.error.issues[0]?.message ?? 'קלט לא תקין' };
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
    return { success: false, message: 'לא הצלחנו לטעון את האירוע' };
  }
  if (!event) return { success: false, message: 'האירוע הזה כבר לא קיים' };
  if (event.status === 'draft') {
    return { success: false, message: 'לאירוע בטיוטה אין סביבת עבודה להפעיל עבורה שליחה' };
  }
  if (event.billing_status === toStatus) {
    return { success: true, message: 'כבר מוגדר' };
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
  return { success: true, message: 'סטטוס החיוב עודכן' };
}
