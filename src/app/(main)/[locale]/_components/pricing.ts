/**
 * Homepage pricing simulator: rates and the quote maths.
 *
 * These are the public per-record rates; nothing else in the app quotes a price. The rates
 * and the bonus rule live in the billing feature, which grants what this page sells.
 */

import type { RecordPackageChannel } from '@/features/billing';
// The utils path, not the barrel: the barrel carries client components, and this module is
// unit-tested outside React.
import {
  RECORD_PACKAGE_CHANNELS,
  RECORD_PACKAGE_RATES,
  bonusRecords,
} from '@/features/billing/utils';

export const PRICING_CHANNELS = RECORD_PACKAGE_CHANNELS;
export type PricingChannel = RecordPackageChannel;

/** Shekels per record, charged once when sending is switched on. */
export const PRICING_RATES = RECORD_PACKAGE_RATES;

export const RECORDS_MIN = 50;
export const RECORDS_MAX = 1000;
export const RECORDS_STEP = 50;

/** The bonus rule is billing's, so the homepage never promises what billing won't grant. */
export { bonusRecords };

/** Clamps to the slider's range and snaps to its step. */
export function clampRecords(value: number): number {
  if (!Number.isFinite(value)) return RECORDS_MIN;
  const snapped = Math.round(value / RECORDS_STEP) * RECORDS_STEP;
  return Math.min(RECORDS_MAX, Math.max(RECORDS_MIN, snapped));
}

export function quote(records: number, channel: PricingChannel) {
  const bonus = bonusRecords(records);
  return {
    total: records * PRICING_RATES[channel],
    bonus,
    packageSize: records + bonus,
  };
}
