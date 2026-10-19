/**
 * Quoting a Record Package before it is bought: the Plans on sale, the records range, the
 * price, and where a count sits on the gift timeline. Shared by the homepage simulator and
 * the in-app upgrade sheet, so both quote the same way billing grants (ADR 0027, 0034).
 */

import type { RecordPackageChannel } from '../types';
import { BONUS_STEPS, RECORD_PACKAGE_RATES, bonusRecords } from './record-package';

/**
 * The Plans on sale (ADR 0034). `sms` is still a billing channel, so a past payment keeps
 * its meaning, but it is no longer offered.
 */
export const PRICING_CHANNELS = ['whatsapp', 'whatsapp_calls'] as const satisfies readonly RecordPackageChannel[];
export type PricingChannel = (typeof PRICING_CHANNELS)[number];

/** A package's channel as a Plan on sale, or null for one no longer sold (SMS) or none. */
export function onSale(channel: RecordPackageChannel | null | undefined): PricingChannel | null {
  return PRICING_CHANNELS.find((c) => c === channel) ?? null;
}

const SHEKELS = new Map<string, Intl.NumberFormat>();

/** Shekels to at most two decimals, the way every price is shown. Built once per locale. */
export function formatShekels(amount: number, locale: string): string {
  let format = SHEKELS.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    SHEKELS.set(locale, format);
  }
  return format.format(amount);
}

export const RECORDS_MIN = 50;
export const RECORDS_MAX = 1000;
export const RECORDS_STEP = 10;

/** Clamps to the slider's range and snaps to its step. */
export function clampRecords(value: number): number {
  if (!Number.isFinite(value)) return RECORDS_MIN;
  const snapped = Math.round(value / RECORDS_STEP) * RECORDS_STEP;
  return Math.min(RECORDS_MAX, Math.max(RECORDS_MIN, snapped));
}

export function quote(records: number, channel: PricingChannel) {
  const bonus = bonusRecords(records);
  return {
    total: records * RECORD_PACKAGE_RATES[channel],
    bonus,
    packageSize: records + bonus,
  };
}

/** The gift timeline runs from the slider's minimum to half again past the last bonus step. */
export const GIFT_TRACK_END = BONUS_STEPS[BONUS_STEPS.length - 1].minPaid * 1.5;

/** Where a record count sits on a track from the slider's minimum to `end`, in percent. */
export function trackPct(records: number, end: number): number {
  return Math.min(Math.max((records - RECORDS_MIN) / (end - RECORDS_MIN), 0), 1) * 100;
}
