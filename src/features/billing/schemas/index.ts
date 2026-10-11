import { z } from 'zod';
import { RECORD_PACKAGE_CHANNELS } from '../utils/record-package';

/**
 * The commercial state of an Event - the "Free to Plan, Pay to Send" boundary,
 * per Event (a couple with two weddings can have one paid and one still free).
 *
 * `events.billing_status` is the head; `event_billing_events` is the log of how it
 * got there. `events.can_create_schedules` is generated from it in the database
 * (`paid` => can send) so the outbound-reach gate can never disagree. `comped` was
 * retired by ADR 0027: a free Event is a recorded payment of 0 with method `gift`.
 */
export const EVENT_BILLING_STATUSES = [
  'free',
  'payment_pending',
  'paid',
  'canceled',
] as const;

export const EventBillingStatusSchema = z.enum(EVENT_BILLING_STATUSES);

/**
 * Statuses an operator can move an event to by hand from the Back Office. `paid` is not
 * one of them: it only comes from recording a payment, which also sets the package.
 */
export const MANUAL_BILLING_STATUSES = ['free', 'payment_pending', 'canceled'] as const;

export const SetEventBillingStatusSchema = z.object({
  eventId: z.uuid(),
  toStatus: z.enum(MANUAL_BILLING_STATUSES),
  note: z
    .string()
    .trim()
    .max(500, 'ההערה צריכה להיות קצרה מ-500 תווים')
    .optional(),
});

export const BILLING_PAYMENT_METHODS = [
  'bank_transfer',
  'bit',
  'isracard',
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
      .number({ error: 'צריך להזין כמה רשומות שולמו' })
      .int('מספר הרשומות צריך להיות שלם')
      .min(1, 'לפחות רשומה אחת')
      .max(MAX_RECORDS_PER_PAYMENT, `At most ${MAX_RECORDS_PER_PAYMENT.toLocaleString('en-GB')} records in one payment`),
    channel: z.enum(RECORD_PACKAGE_CHANNELS),
    amount: z
      .number({ error: 'צריך להזין את הסכום שהתקבל' })
      .min(0, 'הסכום לא יכול להיות שלילי')
      .max(1_000_000, 'הסכום גדול מדי')
      .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, 'עד שתי ספרות אחרי הנקודה'),
    method: z.enum(BILLING_PAYMENT_METHODS),
    reference: z.string().trim().max(100, 'האסמכתה צריכה להיות קצרה מ-100 תווים').optional(),
    note: z.string().trim().max(500, 'ההערה צריכה להיות קצרה מ-500 תווים').optional(),
  })
  .refine((p) => p.method !== 'gift' || p.amount === 0, {
    message: 'מתנה היא תשלום של ₪0',
    path: ['amount'],
  })
  .refine((p) => p.method === 'gift' || p.amount > 0, {
    message: 'תשלום של ₪0 הוא מתנה - צריך לבחור מתנה כאמצעי התשלום',
    path: ['method'],
  });

/** Null resets the bonus to the automatic rule. */
export const SetBonusOverrideSchema = z.object({
  eventId: z.uuid(),
  bonus: z
    .number()
    .int('הבונוס צריך להיות מספר שלם')
    .min(0, 'הבונוס לא יכול להיות שלילי')
    .max(1000, 'עד 1,000 רשומות בונוס')
    .nullable(),
});
