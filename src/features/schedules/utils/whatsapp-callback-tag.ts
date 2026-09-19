/**
 * The tag every outbound WhatsApp message carries in `biz_opaque_callback_data`,
 * which Meta echoes back on each of that message's status webhooks.
 *
 * It is how a status finds what it belongs to without searching for its
 * `wamid`: a `wamid` exists only once the send call returns and is written
 * after that, so Meta's `sent` regularly beats it. The tag is known before the
 * send - the attempt id comes from the claim, the inbound row id from the
 * conversation's own claim - so a tagged status never has to wait.
 *
 * Each sender has one kind, and the webhook processor decides by kind alone:
 *
 *  - `attempt:<id>`       - a Delivery Attempt, posted by the Worker or a
 *                           manual send. Its statuses are applied to that row.
 *  - `conversation:<id>`  - a Confirmation Conversation reply (ADR 0017),
 *                           keyed by the inbound message it answers. No attempt.
 *  - `test`               - a Test Message. Nothing is recorded for it.
 *
 * A new send path adds a kind here, which is the point: the processor cannot
 * mistake an untracked sender for a missing attempt, because an untracked
 * sender does not exist.
 */

export type WhatsAppCallbackTag =
  | { kind: 'attempt'; attemptId: string }
  | { kind: 'conversation'; inboundMessageId: string }
  | { kind: 'test' };

export function attemptTag(attemptId: string): string {
  return `attempt:${attemptId}`;
}

export function conversationTag(inboundMessageId: string): string {
  return `conversation:${inboundMessageId}`;
}

export const TEST_MESSAGE_TAG = 'test';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads a tag back, or null for a missing or unrecognised one. Null means Kululu
 * did not tag the message - sent before tags existed, or by something else
 * sharing the number.
 */
export function parseCallbackTag(value: string | null | undefined): WhatsAppCallbackTag | null {
  if (!value) return null;
  if (value === TEST_MESSAGE_TAG) return { kind: 'test' };

  const separator = value.indexOf(':');
  if (separator <= 0) return null;
  const kind = value.slice(0, separator);
  const id = value.slice(separator + 1);
  // Both ids are uuid columns. Anything else was not written by Kululu, and
  // looking it up would fail the query rather than match nothing.
  if (!UUID_REGEX.test(id)) return null;

  if (kind === 'attempt') return { kind: 'attempt', attemptId: id };
  if (kind === 'conversation') return { kind: 'conversation', inboundMessageId: id };
  return null;
}
