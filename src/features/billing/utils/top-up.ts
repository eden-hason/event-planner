/**
 * Top-ups (ADR 0042): more Paid Records for a package that is already open, on the
 * package's own Plan and at its rate, in steps of 10 with no ceiling, and with no Bonus
 * Records. Pure, so the Owner's surfaces and their tests read one rule.
 */

import { daysUntil } from '@/lib/date-time';
import type { EventBillingStatus, RecordPackageChannel } from '../types';
import { PRICING_CHANNELS, RECORDS_STEP, type PricingChannel } from './pricing';
import { RECORD_PACKAGE_RATES } from './record-package';

export const TOP_UP_MIN = 10;
export const TOP_UP_STEP = RECORDS_STEP;

/** Snaps to the step and lifts to the minimum. There is no maximum. */
export function clampTopUp(value: number): number {
  if (!Number.isFinite(value)) return TOP_UP_MIN;
  return Math.max(TOP_UP_MIN, Math.round(value / TOP_UP_STEP) * TOP_UP_STEP);
}

/** The first top-up to offer: enough to cover what is over the package, else 50. */
export function suggestedTopUp(over: number): number {
  return over > 0 ? Math.max(TOP_UP_MIN, Math.ceil(over / TOP_UP_STEP) * TOP_UP_STEP) : 50;
}

export function topUpTotal(records: number, plan: PricingChannel): number {
  return records * RECORD_PACKAGE_RATES[plan];
}

/**
 * The Plan an Event may top up on, or null when it may not. Only a paid package can grow,
 * and only on the Plan it was bought on: never a gift from Kululu, never a Plan no longer on
 * sale, and never once the Event day is over.
 */
export function topUpPlan(input: {
  billingStatus: EventBillingStatus | null;
  /** The package's Plan: its latest payment's channel. */
  channel: RecordPackageChannel | null;
  gifted: boolean;
  eventDate: string | null;
  now?: Date;
}): PricingChannel | null {
  if (input.billingStatus !== 'paid' || input.gifted) return null;
  const plan = PRICING_CHANNELS.find((c) => c === input.channel);
  if (!plan) return null;
  if (input.eventDate && daysUntil(input.eventDate, input.now) < 0) return null;
  return plan;
}
