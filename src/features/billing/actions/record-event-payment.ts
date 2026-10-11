'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import { applyBillingTransition } from '../services';
import { RecordEventPaymentSchema } from '../schemas';
import type { BillingActionResult } from '../types';

/**
 * Records a payment taken outside the system (ADR 0021): adds its records to the Event's
 * Paid Records and moves it to `paid` (ADR 0027). A top-up is just another payment.
 *
 * The reference goes in as the provider ref, which makes the database call idempotent on it.
 * That would silently swallow a second payment that reuses a reference, so a reuse is
 * refused here instead, with a message the Operator can act on.
 */
export async function recordEventPayment(input: unknown): Promise<BillingActionResult> {
  const operatorId = await assertAdmin();

  const parsed = RecordEventPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'קלט לא תקין' };
  }
  const { eventId, records, channel, amount, method, reference, note } = parsed.data;

  const supabase = createServiceClient();

  const { data: event, error: readError } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .maybeSingle();
  if (readError) {
    console.error('recordEventPayment read failed:', readError);
    return { success: false, message: 'לא הצלחנו לטעון את האירוע' };
  }
  if (!event) return { success: false, message: 'האירוע הזה כבר לא קיים' };
  if (event.status === 'draft') {
    return { success: false, message: 'לאירוע בטיוטה אין סביבת עבודה לרשום עבורה תשלום' };
  }

  if (reference) {
    const { data: existing, error } = await supabase
      .from('event_billing_events')
      .select('event_id')
      .eq('provider', 'manual')
      .eq('provider_ref', reference)
      .maybeSingle();
    if (error) {
      console.error('recordEventPayment reference check failed:', error);
      return { success: false, message: 'לא הצלחנו לבדוק את האסמכתה' };
    }
    if (existing) {
      return {
        success: false,
        message:
          existing.event_id === eventId
            ? 'האסמכתה הזו כבר רשומה לאירוע הזה'
            : 'האסמכתה הזו כבר רשומה לאירוע אחר',
      };
    }
  }

  const result = await applyBillingTransition(supabase, {
    eventId,
    toStatus: 'paid',
    provider: 'manual',
    providerRef: reference || undefined,
    amount,
    channel,
    recordCount: records,
    paymentMethod: method,
    note: note || undefined,
    createdBy: operatorId,
  });
  if (!result.ok) return { success: false, message: 'לא הצלחנו לרשום את התשלום' };

  revalidateOutreach(eventId);
  return { success: true, message: method === 'gift' ? 'המתנה נרשמה' : 'התשלום נרשם' };
}
