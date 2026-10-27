import type { BillingPaymentKind, EventPayment, RecordsPayment } from '../types';

/** The payments that added Paid Records - all a Record Package is counted from. */
export function isRecordsPayment(payment: EventPayment): payment is RecordsPayment {
  return payment.kind !== 'extra_schedule';
}

/**
 * Why an Operator may not record this kind of payment now, or null when they may (ADR 0045).
 * The Back Office form greys a kind out with this reason, and the Server Action refuses with
 * it, so the two never disagree. The Plan opens the package, once; an upsale adds to it, so
 * it needs the Plan first.
 */
export function paymentKindBlocker(kind: BillingPaymentKind, hasPlan: boolean): string | null {
  if (kind === 'plan') {
    return hasPlan ? 'לאירוע כבר יש חבילה. רשומות נוספות נרשמות כתוספת' : null;
  }
  return hasPlan ? null : 'קודם צריך לרשום חבילה';
}
