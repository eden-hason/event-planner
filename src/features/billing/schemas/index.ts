import { z } from 'zod';
import { RECORD_PACKAGE_CHANNELS } from '../utils/record-package';

/**
 * The commercial state of an Event - the "Free to Plan, Pay to Send" boundary,
 * per Event (a couple with two weddings can have one paid and one still free).
 *
 * `events.billing_status` is the head; `event_billing_events` is the log of how it
 * got there. `events.can_create_schedules` is generated from it in the database
 * (`paid | comped` => can send) so the outbound-reach gate can never disagree.
 */
export const EVENT_BILLING_STATUSES = [
  'free',
  'payment_pending',
  'paid',
  'comped',
  'canceled',
] as const;

export const EventBillingStatusSchema = z.enum(EVENT_BILLING_STATUSES);

/** Statuses an operator can move an event to by hand from the Back Office. */
export const MANUAL_BILLING_STATUSES = [
  'free',
  'payment_pending',
  'comped',
  'canceled',
] as const;

export const SetEventBillingStatusSchema = z.object({
  eventId: z.uuid(),
  toStatus: z.enum(MANUAL_BILLING_STATUSES),
  note: z
    .string()
    .trim()
    .max(500, 'Keep the note under 500 characters')
    .optional(),
});

export const BILLING_PAYMENT_METHODS = [
  'bank_transfer',
  'bit',
  'cash',
  'gift',
  'other',
] as const;

/** Upper bound on one payment, well past the homepage slider's 1000. */
const MAX_RECORDS_PER_PAYMENT = 10_000;

/**
 * An Operator recording a payment taken outside the system (ADR 0021, ADR 0027). Every
 * payment adds to Paid Records and moves the Event to `paid`. A free Event is a gift: a
 * payment of exactly 0.
 */
export const RecordEventPaymentSchema = z
  .object({
    eventId: z.uuid(),
    records: z
      .number({ error: 'Enter how many records were paid for' })
      .int('Records must be a whole number')
      .min(1, 'At least one record')
      .max(MAX_RECORDS_PER_PAYMENT, `At most ${MAX_RECORDS_PER_PAYMENT.toLocaleString('en-GB')} records in one payment`),
    channel: z.enum(RECORD_PACKAGE_CHANNELS),
    amount: z
      .number({ error: 'Enter the amount received' })
      .min(0, 'The amount cannot be negative')
      .max(1_000_000, 'That amount is too large')
      .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, 'Use at most two decimal places'),
    method: z.enum(BILLING_PAYMENT_METHODS),
    reference: z.string().trim().max(100, 'Keep the reference under 100 characters').optional(),
    note: z.string().trim().max(500, 'Keep the note under 500 characters').optional(),
  })
  .refine((p) => p.method !== 'gift' || p.amount === 0, {
    message: 'A gift is a payment of ₪0',
    path: ['amount'],
  })
  .refine((p) => p.method === 'gift' || p.amount > 0, {
    message: 'A payment of ₪0 is a gift - choose Gift as the method',
    path: ['method'],
  });

/** Null resets the bonus to the automatic rule. */
export const SetBonusOverrideSchema = z.object({
  eventId: z.uuid(),
  bonus: z
    .number()
    .int('Bonus must be a whole number')
    .min(0, 'Bonus cannot be negative')
    .max(1000, 'At most 1,000 bonus records')
    .nullable(),
});
