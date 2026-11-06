/**
 * The pure rules of a Hand Delivery (CONTEXT.md, ADR 0052): an Operator sends a
 * Schedule's message on WhatsApp from a Kululu team phone and records that it
 * reached the Guest. Kept apart from the service so it is tested without a
 * database.
 */

/** The `triggered_by` of a Hand Delivery's attempt */
export const HAND_TRIGGER = 'hand';

export function isHandTrigger(triggeredBy: string | null | undefined): boolean {
  return triggeredBy === HAND_TRIGGER;
}

/**
 * A WhatsApp click-to-chat link that opens a chat with `phoneE164` on whatever
 * device the Operator is on, with `text` typed in and not yet sent. wa.me
 * wants the number as digits alone, with no `+`.
 */
export function whatsappChatUrl(phoneE164: string, text: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export type HandDeliveryRefusal = 'not_failed' | 'already_by_hand';

/**
 * Why a Delivery offers no Hand Delivery, or null when it does. Any Failed
 * Delivery qualifies, whatever the failure and whether SMS was tried: the
 * Operator sees the error and decides. A Guest already Reached, or one nothing
 * was sent to, is not a Hand Delivery's to fix.
 */
export function handDeliveryRefusal(delivery: {
  status: string;
  attempts: readonly { triggered_by: string | null }[];
}): HandDeliveryRefusal | null {
  if (delivery.attempts.some((attempt) => isHandTrigger(attempt.triggered_by))) {
    return 'already_by_hand';
  }
  return delivery.status === 'failed' ? null : 'not_failed';
}

/**
 * Whether the Guest was reached by the Hand Delivery itself rather than by a
 * message Kululu sent. Another attempt that reached them (a late SMS report)
 * is the provider's word, and that wins the telling.
 */
export function reachedByHand(
  attempts: readonly { triggered_by: string | null; status: string }[],
): boolean {
  return (
    attempts.some((attempt) => isHandTrigger(attempt.triggered_by)) &&
    !attempts.some(
      (attempt) =>
        !isHandTrigger(attempt.triggered_by) &&
        (attempt.status === 'delivered' || attempt.status === 'read'),
    )
  );
}
