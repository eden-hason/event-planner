import { z } from 'zod';

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
