'use server';

import { after } from 'next/server';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import { sweepOwnerMessages } from '@/features/owner-messages/services';
import { applyBillingTransition } from '../services';
import { RecordEventPaymentSchema } from '../schemas';
import { paymentKindBlocker } from '../utils/payment-kinds';
import type { BillingActionResult } from '../types';

/**
 * Records a payment taken outside the system (ADR 0021) and moves the Event to `paid`
 * (ADR 0027). What it bought is its kind (ADR 0045): the Plan opens the Record Package, a
 * Top-up adds Paid Records on the package's own Plan (ADR 0042, `applyBillingTransition`
 * refuses any other), and an Extra Schedule leaves the package alone - the Operator creates
 * the Schedule itself by hand.
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
  const payment = parsed.data;
  const { eventId, amount, method, reference, note } = payment;

  const supabase = createServiceClient();

  // None of these reads depends on another. The plan count is held to by the unique index and
  // the database function as well; reading it first gives the Operator a message instead of
  // a failed insert.
  const [eventRes, planRes, referenceRes] = await Promise.all([
    supabase.from('events').select('status').eq('id', eventId).maybeSingle(),
    supabase
      .from('event_billing_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('kind', 'plan'),
    reference
      ? supabase
          .from('event_billing_events')
          .select('event_id')
          .eq('provider', 'manual')
          .eq('provider_ref', reference)
          .maybeSingle()
      : null,
  ]);

  if (eventRes.error) {
    console.error('recordEventPayment read failed:', eventRes.error);
    return { success: false, message: 'לא הצלחנו לטעון את האירוע' };
  }
  const event = eventRes.data;
  if (!event) return { success: false, message: 'האירוע הזה כבר לא קיים' };
  if (event.status === 'draft') {
    return { success: false, message: 'לאירוע בטיוטה אין סביבת עבודה לרשום עבורה תשלום' };
  }

  if (planRes.error || planRes.count === null) {
    console.error('recordEventPayment plan check failed:', planRes.error);
    return { success: false, message: 'לא הצלחנו לטעון את החבילה' };
  }
  const blocker = paymentKindBlocker(payment.kind, planRes.count > 0);
  if (blocker) return { success: false, message: blocker };

  if (referenceRes?.error) {
    console.error('recordEventPayment reference check failed:', referenceRes.error);
    return { success: false, message: 'לא הצלחנו לבדוק את האסמכתה' };
  }
  const existing = referenceRes?.data;
  if (existing) {
    return {
      success: false,
      message:
        existing.event_id === eventId
          ? 'האסמכתה הזו כבר רשומה לאירוע הזה'
          : 'האסמכתה הזו כבר רשומה לאירוע אחר',
    };
  }

  const result = await applyBillingTransition(supabase, {
    eventId,
    toStatus: 'paid',
    provider: 'manual',
    providerRef: reference || undefined,
    amount,
    kind: payment.kind,
    ...(payment.kind === 'extra_schedule'
      ? { scheduleCount: payment.schedules }
      : { channel: payment.channel, recordCount: payment.records }),
    paymentMethod: method,
    note: note || undefined,
    createdBy: operatorId,
  });
  if (!result.ok) {
    return {
      success: false,
      message:
        result.reason === 'otherPlan'
          ? 'תוספת רשומות נרשמת באותה חבילה של האירוע'
          : 'לא הצלחנו לרשום את התשלום',
    };
  }

  // A first payment queues the Owner's Welcome (ADR 0039). Sent straight after
  // the response rather than on the next Sweeper pass, because the Owner has
  // just paid; the Sweeper still picks it up if this does not run.
  after(async () => {
    await sweepOwnerMessages(supabase, { eventId });
  });

  revalidateOutreach(eventId);
  return { success: true, message: method === 'gift' ? 'המתנה נרשמה' : 'התשלום נרשם' };
}
