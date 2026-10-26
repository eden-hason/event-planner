import { isPaymentMethodKey, PAYMENT_METHODS, type PaymentMethodKey } from '../types';

/** The fields the Gifts hero and the table filters read from a row. */
export interface GiftSummaryRow {
  amount: number | '' | null;
  paymentMethod: string | null;
}

/** `none` is a logged amount whose payment method has not been picked yet. */
export type GiftSegmentKey = PaymentMethodKey | 'none';

export interface GiftSegment {
  key: GiftSegmentKey;
  amount: number;
  count: number;
  /** Share of the total amount, rounded. */
  percent: number;
}

export interface GiftSummary {
  /** Every row in the log: confirmed guests plus gifts added by hand. */
  rowCount: number;
  /** Rows with an amount. */
  loggedCount: number;
  missingAmountCount: number;
  /** Rows with an amount but no payment method. */
  missingMethodCount: number;
  total: number;
  average: number;
  largest: number;
  /**
   * Logged rows out of all rows. Rounded down until the last row is in, so
   * 209 of 210 reads 99% rather than an early 100%.
   */
  progressPercent: number;
  /** Every row has both an amount and a payment method. */
  isComplete: boolean;
  /** Largest first, with the not-yet-picked share last. */
  segments: GiftSegment[];
}

export type GiftFilter = 'all' | 'noAmount' | 'noMethod';

/** The row's amount when it counts as logged - a positive number - else null. */
export function giftAmount(row: GiftSummaryRow): number | null {
  if (row.amount === '' || row.amount === null) return null;
  const amount = Number(row.amount);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function segmentKey(row: GiftSummaryRow): GiftSegmentKey {
  if (!row.paymentMethod) return 'none';
  // A value outside the known list still counts, under "other".
  return isPaymentMethodKey(row.paymentMethod) ? row.paymentMethod : 'other';
}

export function summarizeGifts(rows: GiftSummaryRow[]): GiftSummary {
  const buckets = new Map<GiftSegmentKey, { amount: number; count: number }>();
  let total = 0;
  let largest = 0;
  let loggedCount = 0;

  for (const row of rows) {
    const amount = giftAmount(row);
    if (amount === null) continue;
    loggedCount += 1;
    total += amount;
    largest = Math.max(largest, amount);
    const key = segmentKey(row);
    const bucket = buckets.get(key) ?? { amount: 0, count: 0 };
    bucket.amount += amount;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const toSegment = (key: GiftSegmentKey): GiftSegment | null => {
    const bucket = buckets.get(key);
    if (!bucket) return null;
    return {
      key,
      amount: bucket.amount,
      count: bucket.count,
      percent: total > 0 ? Math.round((bucket.amount / total) * 100) : 0,
    };
  };

  const methodSegments = PAYMENT_METHODS.map(toSegment)
    .filter((segment): segment is GiftSegment => segment !== null)
    .sort((a, b) => b.amount - a.amount);
  const noneSegment = toSegment('none');

  const rowCount = rows.length;
  const missingMethodCount = noneSegment?.count ?? 0;

  return {
    rowCount,
    loggedCount,
    missingAmountCount: rowCount - loggedCount,
    missingMethodCount,
    total,
    average: loggedCount > 0 ? Math.round(total / loggedCount) : 0,
    largest,
    progressPercent:
      rowCount === 0
        ? 0
        : loggedCount === rowCount
          ? 100
          : Math.floor((loggedCount / rowCount) * 100),
    isComplete: rowCount > 0 && loggedCount === rowCount && missingMethodCount === 0,
    segments: noneSegment ? [...methodSegments, noneSegment] : methodSegments,
  };
}

/** `method` narrows to one payment method on top of `filter`; null keeps them all. */
export function matchesGiftFilter(
  row: GiftSummaryRow,
  filter: GiftFilter,
  method: PaymentMethodKey | null = null,
): boolean {
  const logged = giftAmount(row) !== null;
  if (filter === 'noAmount' && logged) return false;
  if (filter === 'noMethod' && (!logged || row.paymentMethod)) return false;
  if (method && row.paymentMethod !== method) return false;
  return true;
}
