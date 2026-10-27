import { z } from 'zod';
import { PRICING_CHANNELS } from '../utils/pricing';

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

/** Upper bound on Extra Schedules in one payment: more than any Event has Schedules. */
const MAX_SCHEDULES_PER_PAYMENT = 20;

const records = z
  .number({ error: 'צריך להזין כמה רשומות שולמו' })
  .int('מספר הרשומות צריך להיות שלם')
  .min(1, 'לפחות רשומה אחת')
  .max(MAX_RECORDS_PER_PAYMENT, `עד ${MAX_RECORDS_PER_PAYMENT.toLocaleString('he-IL')} רשומות בתשלום אחד`);

// Only the Plans on sale (ADR 0034): past `sms` payments keep their channel, but no new one is recorded on it.
const channel = z.enum(PRICING_CHANNELS);

/** The money side, the same whatever was bought. */
const paymentFields = {
  eventId: z.uuid(),
  amount: z
    .number({ error: 'צריך להזין את הסכום שהתקבל' })
    .min(0, 'הסכום לא יכול להיות שלילי')
    .max(1_000_000, 'הסכום גדול מדי')
    .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, 'עד שתי ספרות אחרי הנקודה'),
  method: z.enum(BILLING_PAYMENT_METHODS),
  reference: z.string().trim().max(100, 'האסמכתה צריכה להיות קצרה מ-100 תווים').optional(),
  note: z.string().trim().max(500, 'ההערה צריכה להיות קצרה מ-500 תווים').optional(),
};

/**
 * An Operator recording a payment taken outside the system (ADR 0021, ADR 0027, ADR 0045):
 * the Plan that opens the package, or an upsale on it. A free Event is a gift: a payment of
 * exactly 0. A new kind is one more branch here, with the fields it carries.
 */
export const RecordEventPaymentSchema = z
  .discriminatedUnion('kind', [
    z.object({ kind: z.literal(['plan', 'top_up']), records, channel, ...paymentFields }),
    z.object({
      kind: z.literal('extra_schedule'),
      schedules: z
        .number({ error: 'צריך להזין כמה תזמונים נוספים נרכשו' })
        .int('מספר התזמונים צריך להיות שלם')
        .min(1, 'לפחות תזמון אחד')
        .max(MAX_SCHEDULES_PER_PAYMENT, `עד ${MAX_SCHEDULES_PER_PAYMENT} תזמונים בתשלום אחד`),
      ...paymentFields,
    }),
  ])
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
