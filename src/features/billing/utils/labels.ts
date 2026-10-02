import type { BillingPaymentMethod, EventBillingStatus, RecordPackageChannel } from '../types';

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

/** Back Office labels for the channel a package was bought for. */
export const RECORD_PACKAGE_CHANNEL_LABELS: Record<RecordPackageChannel, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  whatsapp_calls: 'WhatsApp + calls',
};

/** Back Office labels for how a payment was made. */
export const PAYMENT_METHOD_LABELS: Record<BillingPaymentMethod, string> = {
  bank_transfer: 'Bank transfer',
  bit: 'Bit',
  cash: 'Cash',
  gift: 'Gift',
  other: 'Other',
};
