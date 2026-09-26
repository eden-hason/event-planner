/**
 * Homepage pricing simulator: rates and the quote maths.
 *
 * These are the public per-record rates; nothing else in the app quotes a price.
 */

export const PRICING_CHANNELS = ['sms', 'whatsapp', 'whatsapp_calls'] as const;
export type PricingChannel = (typeof PRICING_CHANNELS)[number];

/** Shekels per record, charged once when sending is switched on. */
export const PRICING_RATES: Record<PricingChannel, number> = {
  sms: 1,
  whatsapp: 1.5,
  whatsapp_calls: 2,
};

export const RECORDS_MIN = 50;
export const RECORDS_MAX = 1000;
export const RECORDS_STEP = 50;

/** Up to this many paid records the bonus is the small one. */
const SMALL_PACK_MAX = 200;
const SMALL_PACK_BONUS = 10;
const BIG_PACK_BONUS = 20;

/** Free extra records for last-minute guests, on top of the paid ones. */
export function bonusRecords(records: number): number {
  return records <= SMALL_PACK_MAX ? SMALL_PACK_BONUS : BIG_PACK_BONUS;
}

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
    capacity: records + bonus,
  };
}
