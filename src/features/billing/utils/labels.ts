import type { BillingPaymentMethod, EventBillingStatus, RecordPackageChannel } from '../types';

/**
 * Hebrew labels for the billing statuses. The Back Office is Hebrew-only, so
 * these are plain constants, not i18n - the owner-facing pill and sheet get
 * their copy from the `billing` message namespace instead.
 */
export const BILLING_STATUS_LABELS: Record<EventBillingStatus, string> = {
  free: 'חינם',
  payment_pending: 'ממתין לתשלום',
  paid: 'שולם',
  canceled: 'בוטל',
};

/** Back Office labels for the channel a package was bought for. */
export const RECORD_PACKAGE_CHANNEL_LABELS: Record<RecordPackageChannel, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  whatsapp_calls: 'WhatsApp + שיחות',
};

/** Back Office labels for how a payment was made. */
export const PAYMENT_METHOD_LABELS: Record<BillingPaymentMethod, string> = {
  bank_transfer: 'העברה בנקאית',
  bit: 'ביט',
  isracard: 'ישראכרט',
  cash: 'מזומן',
  gift: 'מתנה',
  other: 'אחר',
};
