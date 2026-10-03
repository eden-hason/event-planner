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

/** How full the package is: `near` from 90% used, warning colour only when `over`. */
export type PackageState = 'room' | 'near' | 'full' | 'over';

/**
 * The Record Package as the Guests page shows it - counts only, never money, so it is safe
 * for a collaborator too. `outsideIds` are the Guest Records a Schedule would skip now.
 */
export type GuestPackageView = {
  paid: number;
  bonus: number;
  size: number;
  used: number;
  left: number;
  over: number;
  state: PackageState;
  /** The latest payment's channel; null only for rows recorded before channels existed. */
  channel: RecordPackageChannel | null;
  /** Every payment was a gift from Kululu. */
  gifted: boolean;
  outsideIds: string[];
};

/** One payment as the Owner's package page lists it: what it bought and what it cost. */
export type PackagePayment = {
  id: string;
  records: number;
  channel: RecordPackageChannel;
  /** Shekels; 0 for a gift. */
  amount: number;
  gift: boolean;
  occurredAt: string;
};

/**
 * The Record Package page (Record Package Plan design): the package as the Guests page sees
 * it, plus the money behind it. Owner-only, because payments carry amounts.
 */
/** The package's numbers without the record ids - all a meter, hero or sheet needs. */
export type PackageCounts = Omit<GuestPackageView, 'outsideIds'>;

export type RecordPackagePageView = PackageCounts & {
  /** An Operator set the bonus by hand, so the page credits the Kululu team for it. */
  bonusIsCustom: boolean;
  /** Newest first. */
  payments: PackagePayment[];
};
