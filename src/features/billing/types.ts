import type { z } from 'zod';
import type { EventBillingStatusSchema } from './schemas';

export type EventBillingStatus = z.infer<typeof EventBillingStatusSchema>;

/**
 * The three visual treatments the header pill has, independent of the five
 * statuses: `premium` (gold, crown) for anything that can send, `plain`
 * (outline) for planning or a lapsed event, `pending` for payment in flight.
 */
export type BillingPillTone = 'premium' | 'plain' | 'pending';

/** What the header needs to render the pill - the label/copy come from i18n. */
export type BillingHeaderStatus = {
  status: EventBillingStatus;
  tone: BillingPillTone;
  sendingEnabled: boolean;
};

export type SetEventBillingStatusResult = { success: boolean; message: string };

/** The channel a Record Package was bought for: recorded and shown, not enforced (backlog 0016). */
export type RecordPackageChannel = 'sms' | 'whatsapp' | 'whatsapp_calls';

/** How an Operator says a payment was made. A gift is always a payment of 0. */
export type BillingPaymentMethod =
  | 'bank_transfer'
  | 'bit'
  | 'isracard'
  | 'cash'
  | 'gift'
  | 'other';

/** An Event's Record Package: Paid Records plus Bonus Records (ADR 0027). */
export type RecordPackage = {
  paid: number;
  bonus: number;
  /** True when an Operator set the bonus instead of the automatic rule. */
  bonusIsCustom: boolean;
  size: number;
};

/** How the guest list sits against the package. */
export type PackageSplit = {
  /** Guest Record ids a Schedule will skip, newest last. */
  outside: string[];
  /** Every Guest Record in the list plus deleted ones that were Reached. */
  used: number;
  left: number;
  over: number;
};

/** One recorded payment, newest first in any list. */
export type EventPayment = {
  id: string;
  records: number;
  channel: RecordPackageChannel;
  amount: number;
  method: BillingPaymentMethod;
  reference: string | null;
  note: string | null;
  /** The Operator who recorded it; null for a provider webhook or a deleted user. */
  createdBy: string | null;
  occurredAt: string;
};

export type BillingActionResult = { success: boolean; message: string };
