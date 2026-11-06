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
 * device the Operator is on, with `text` typed in and not yet sent - or an
 * empty chat when there is no text. wa.me wants the number as digits alone,
 * with no `+`.
 */
export function whatsappChatUrl(phoneE164: string, text: string | null): string {
  const chat = `https://wa.me/${phoneE164.replace(/\D/g, '')}`;
  return text ? `${chat}?text=${encodeURIComponent(text)}` : chat;
}

/** Whether an Operator recorded a Hand Delivery among these attempts */
export function hasHandDelivery(attempts: readonly { triggered_by: string | null }[]): boolean {
  return attempts.some((attempt) => isHandTrigger(attempt.triggered_by));
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
  if (hasHandDelivery(delivery.attempts)) return 'already_by_hand';
  return delivery.status === 'failed' ? null : 'not_failed';
}

/**
 * Whether a Delivery can carry a read receipt, so its Guest counts in the seen
 * rate and may read as unseen. Only Kululu's own WhatsApp reports reading: an
 * SMS never does, and a Hand Delivery went from a team phone. A Guest a
 * provider also reached is told by that report, so it counts again.
 *
 * Lives here, free of imports, because the client-side results filter asks it
 * as well as the server-side readers.
 */
export function carriesReadReceipt(row: {
  delivery: string | null;
  steps: readonly { byHand?: boolean; deliveredAt?: string; readAt?: string }[];
}): boolean {
  if (row.delivery !== 'whatsapp' && row.delivery !== 'on_its_way') return false;
  const reachedByHand =
    row.steps.some((step) => step.byHand) &&
    !row.steps.some((step) => !step.byHand && (step.deliveredAt || step.readAt));
  return !reachedByHand;
}
