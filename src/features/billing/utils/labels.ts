import type { EventBillingStatus } from '../types';

/**
 * English labels for the five billing statuses. The Back Office is English-only,
 * so these are plain constants, not i18n - the owner-facing pill and sheet get
 * their copy from the `billing` message namespace instead.
 */
export const BILLING_STATUS_LABELS: Record<EventBillingStatus, string> = {
  free: 'Free',
  payment_pending: 'Payment pending',
  paid: 'Paid',
  comped: 'Comped',
  canceled: 'Canceled',
};
