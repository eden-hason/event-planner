/**
 * A Delivery as the Owner reads it - its outcome and its messages - shared by
 * the Schedule Results tab (every guest of one Schedule) and the guest
 * drawer's Communication tab (every Schedule of one guest).
 */

import { isSmsFallbackTrigger, smsFallbackReason, type SmsFallbackReason } from './send-helpers';

/**
 * How a schedule's Delivery reads to the Owner (CONTEXT.md: Delivery, Reached).
 *
 * - `whatsapp` / `sms`: Reached, over that channel - the provider confirmed
 *   delivery. For SMS that is the ActiveTrail report the SMS poll reads.
 * - `on_its_way`: WhatsApp accepted it, the phone has not confirmed yet.
 * - `sms_on_its_way`: an SMS is on its way and not confirmed yet - either
 *   accepted by ActiveTrail with no report back, or, after WhatsApp failed, an
 *   automatic SMS Fallback being sent or due once the Schedule settles. Never
 *   the second while a Fallback Freeze holds the batch.
 * - `not_delivered`: every attempt failed and no SMS is coming by itself - a
 *   System-level Failure, a frozen Schedule, or an SMS that failed too.
 * - `no_phone`: targeted, but no attempt was possible, so no send ever
 *   happened. Listed in the table and excluded from the audience total.
 * - `outside_package`: targeted, but the Guest Record was outside the Record
 *   Package when the Schedule sent (ADR 0027). Listed and excluded the same way.
 */
export type GuestDeliveryOutcome =
  | 'whatsapp'
  | 'sms'
  | 'on_its_way'
  | 'sms_on_its_way'
  | 'not_delivered'
  | 'no_phone'
  | 'outside_package';

/**
 * One message on one channel, as the Owner may see it: which channel, and how
 * far it got. Deliberately without the error code, the provider id or who
 * pressed the button - those are Operator facts (CONTEXT.md: Delivery Attempt).
 */
export type GuestDeliveryStep = {
  channel: 'whatsapp' | 'sms';
  /** Why this message is an SMS Fallback; null when it is not one */
  fallback: SmsFallbackReason | null;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  /**
   * When this message was found not to have arrived. The table has no failed-at
   * column, so it is the attempt's last update - the moment the failure landed.
   */
  failedAt?: string;
};

export type GuestInteractionRow = {
  guestId: string;
  guestName: string;
  /** For calling a guest the message did not reach */
  phone?: string;
  /** The Delivery's messages, oldest first. Empty for a guest never sent to */
  steps: GuestDeliveryStep[];
  /** Reached over SMS only because WhatsApp could not reach them */
  viaFallback: boolean;
  /** Null for a guest who interacted but has no delivery record (a shared link) */
  delivery: GuestDeliveryOutcome | null;
  /**
   * WhatsApp read receipt - the guest opened the message itself. SMS reports
   * delivery at most, never reading, so an SMS guest stays false here forever
   * and the UI shows those as not-applicable rather than unseen.
   */
  seen: boolean;
  seenAt?: string;
  /** When the message left us - the only timestamp a guest who did nothing has */
  sentAt?: string;
  response?: 'rsvp_confirm' | 'rsvp_decline';
  respondedAt?: string;
  /** What the guest entered on the RSVP form at the time they responded */
  guestCount?: number;
  /** Headcount on the guest record now - one record can cover a whole family */
  amount: number;
  /** Special Meals per type as answered at the time, e.g. { vegan: 1 } */
  mealCounts?: Record<string, number>;
};

export function toDeliveryOutcome(
  status: string | null,
  channel: string | null,
  notSentReason: string | null,
): GuestDeliveryOutcome {
  switch (status) {
    case 'delivered':
    case 'read':
      return channel === 'sms' ? 'sms' : 'whatsapp';
    case 'sent':
      // Accepted, not confirmed - on either channel.
      return channel === 'sms' ? 'sms_on_its_way' : 'on_its_way';
    case 'failed':
      return 'not_delivered';
    case 'not_sent':
      return notSentReason === 'outside_package' ? 'outside_package' : 'no_phone';
    default:
      // pending: reserved just before sending, the attempt not recorded yet
      return 'on_its_way';
  }
}

export type DeliveryAttemptRow = {
  channel: string;
  status: string;
  error_code: number | null;
  triggered_by: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
};

export function toDeliverySteps(attempts: DeliveryAttemptRow[] | null): GuestDeliveryStep[] {
  const reason = smsFallbackReason(attempts ?? []);
  return (attempts ?? [])
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((attempt) => ({
      channel: attempt.channel === 'sms' ? 'sms' : 'whatsapp',
      fallback: isSmsFallbackTrigger(attempt.triggered_by) ? reason : null,
      sentAt: attempt.sent_at ?? undefined,
      deliveredAt: attempt.delivered_at ?? undefined,
      readAt: attempt.read_at ?? undefined,
      failedAt: attempt.status === 'failed' ? attempt.updated_at : undefined,
    }));
}
