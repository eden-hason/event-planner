/**
 * Some Guests' WhatsApp sends a template's quick reply as text: the Guest taps
 * "נגיע בשמחה", the button looks pressed, and Meta reports a `text` message
 * with the label as its body, quoting the template, instead of a `button` tap.
 * The answer is still unambiguous, so it is read as the tap would have been.
 *
 * Only the exact label of an RSVP button reads as one. The caller has already
 * tied the text to the template send it quotes, so this is never a guess at what
 * free text means (ADR 0017 still holds for that).
 */

export type TypedQuickReply = 'yes' | 'no';

const TRANSFORMER_ANSWERS: Record<string, TypedQuickReply> = {
  rsvpYesPayload: 'yes',
  rsvpNoPayload: 'no',
};

/** Direction marks and zero-width characters some keyboards slip into Hebrew text. */
const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿]/g;

function normalizeLabel(value: string): string {
  return value.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
}

/**
 * The RSVP answer `text` stands for, given the quoted template's
 * `buttonPlaceholders` as stored (unvalidated jsonb), or null when the text is
 * not one of its RSVP buttons' labels.
 */
export function matchTypedQuickReply(
  buttonPlaceholders: unknown,
  text: string,
): TypedQuickReply | null {
  if (!Array.isArray(buttonPlaceholders)) return null;
  const typed = normalizeLabel(text);
  if (!typed) return null;

  for (const button of buttonPlaceholders) {
    if (button?.subType !== 'quick_reply' || typeof button.text !== 'string') continue;
    const answer = TRANSFORMER_ANSWERS[button.placeholders?.[0]?.transformer];
    if (answer && normalizeLabel(button.text) === typed) return answer;
  }
  return null;
}
