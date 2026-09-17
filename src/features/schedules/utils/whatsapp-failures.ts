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

/**
 * Whether a rejection Meta actually answered with is worth trying again.
 *
 * The line that matters is drawn elsewhere - in `sendWhatsAppTemplateMessage`,
 * between a rejection and an unknown outcome. Only a rejection reaches this
 * function, and only a rejection may ever be retried: the message provably did
 * not go out, so there is no duplicate to create. A thrown fetch may well have
 * reached Meta and is never retried at all (ADR 0014).
 *
 * Transient means "the same message, sent again shortly, may succeed":
 * throughput and capacity, not content and not the recipient. Everything else
 * is false, including codes this build has never seen - an unrecognised failure
 * of unknown cause is exactly where a retry could duplicate.
 *
 * Note these codes stay System-level for `classifyWhatsAppFailure`, which is
 * what keeps a throughput failure out of the automatic SMS Fallback. The two
 * classifications answer different questions and are deliberately independent.
 */
const TRANSIENT_CODES = new Set([
  // Throughput budget exceeded for the phone number.
  130429,
  // Business account rate-limit hit.
  131056,
  // Service overloaded / temporary Meta capacity problem.
  133016,
]);

export function isTransient(
  errorCode: number | null | undefined,
  httpStatus?: number | null,
): boolean {
  if (httpStatus === 429) return true;
  if (httpStatus != null && httpStatus >= 500 && httpStatus < 600) return true;
  return errorCode != null && TRANSIENT_CODES.has(errorCode);
}

/**
 * Three attempts at one, five and fifteen minutes. Short enough that a
 * throughput dip is ridden out inside the Send Window, long enough that the
 * third try is not simply the first one again.
 */
export const RETRY_BACKOFF_MINUTES = [1, 5, 15] as const;

/**
 * How long to wait before the next attempt, or null when the ladder is spent
 * and the Delivery should be left failed for an Operator.
 *
 * `attemptCount` is how many attempts have already been made, so 1 asks for the
 * delay after the first failure.
 */
export function nextRetryDelayMinutes(attemptCount: number): number | null {
  const index = Math.max(1, Math.floor(attemptCount)) - 1;
  return RETRY_BACKOFF_MINUTES[index] ?? null;
}
