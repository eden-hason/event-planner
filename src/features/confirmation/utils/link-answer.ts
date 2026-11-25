/**
 * Which Delivery Attempt an answer on a Delivery's own RSVP link proves arrived
 * (Reached by Reply, ADR 0058).
 *
 * The link carries the Delivery's confirmation token, and that token goes out
 * in every message of the Delivery - the WhatsApp message and any SMS after
 * it - so the answer proves one of them arrived without saying which. It is
 * credited to the latest one that went out before the answer: an SMS Fallback
 * follows a WhatsApp message that did not land, so the latest is the likeliest
 * carrier. Either way the Delivery is Delivered, which is the fact that matters.
 *
 * An attempt that never went out (no sent_at) carried nothing.
 */

export type LinkAnswerCandidate = {
  id: string;
  sent_at: string | null;
};

export function linkAnswerAttempt<T extends LinkAnswerCandidate>(
  attempts: readonly T[],
  answeredAt: Date,
): T | null {
  let best: T | null = null;
  let bestAt = -Infinity;
  for (const attempt of attempts) {
    if (!attempt.sent_at) continue;
    const at = Date.parse(attempt.sent_at);
    if (Number.isNaN(at) || at > answeredAt.getTime()) continue;
    if (at > bestAt) {
      best = attempt;
      bestAt = at;
    }
  }
  return best;
}
