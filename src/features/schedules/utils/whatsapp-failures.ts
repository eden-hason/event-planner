/**
 * Which side a failed WhatsApp attempt is on. See CONTEXT.md (Guest-level
 * Failure, System-level Failure) and docs/adr/0012.
 *
 * - `guest`: caused by the guest's own number. Another channel is the right
 *   remedy, so the delivery is eligible for an SMS Fallback.
 * - `system`: caused by Kululu's side - a template, the account, throughput. It
 *   typically hits the whole audience at once; the remedy is fixing the cause
 *   and resending on WhatsApp, never a paid SMS to everyone.
 *
 * Pure and dependency-free so the Back Office, the webhook and the send engine
 * all classify identically.
 */
export type WhatsAppFailureSide = 'guest' | 'system';

/**
 * The only codes treated as guest-level. Everything else - including any code
 * not listed here - is system-level: an unrecognised code stays out of the SMS
 * batch and is shown to the Operator with its code, and moving it here is the
 * one-line change that lets those guests fall back. Wrongly excluding costs a
 * short delay; wrongly including sends irreversible SMS at Kululu's cost.
 */
const GUEST_LEVEL_CODES = new Map<number, string>([
  // Message undeliverable: the number is not on WhatsApp, or on a client too old.
  [131026, 'Not reachable on WhatsApp'],
  // Per-user marketing cap: Meta withheld it "to maintain healthy ecosystem engagement".
  [131049, 'WhatsApp withheld the message'],
  // The guest stopped marketing messages from Kululu. Still falls back (ADR 0012).
  [131050, 'Guest stopped WhatsApp messages'],
  // The number is in a Meta marketing-message experiment holdout.
  [130472, 'WhatsApp withheld the message'],
  // Recipient cannot be sender: the guest's number is Kululu's own business number.
  [131021, 'Invalid recipient number'],
]);

export function classifyWhatsAppFailure(
  errorCode: number | null | undefined,
): WhatsAppFailureSide {
  return errorCode != null && GUEST_LEVEL_CODES.has(errorCode)
    ? 'guest'
    : 'system';
}

/** A short Operator-facing reason for a guest-level code, or null for anything else. */
export function describeGuestLevelFailure(
  errorCode: number | null | undefined,
): string | null {
  return errorCode != null ? (GUEST_LEVEL_CODES.get(errorCode) ?? null) : null;
}
