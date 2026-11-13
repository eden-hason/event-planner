/**
 * The building blocks every stage's message is written in: a body as fixed
 * text and variables, and the buttons.
 *
 * A body is written once, as parts, and everything else is derived from it:
 * the Meta template text (variables numbered `{{1}}`, `{{2}}` in order), the
 * body parameters of a send (one per variable, in the same order), and the
 * plain text the SMS and the preview show (variables filled in). One source is
 * what keeps the parameter count of a send equal to the template's variable
 * count, which Meta otherwise rejects for the whole audience.
 */

import type { KululuValueKey } from './fields';
import type { ParagraphCount } from './shape';

/** The Meta language every Message Plan template is registered in. */
export const MESSAGE_PLAN_LANGUAGE = 'he';

/** A variable in a body: a Kululu Wording value, or the Owner's paragraph n (0-based). */
export type BodyVariable =
  | { kind: 'value'; key: KululuValueKey }
  | { kind: 'paragraph'; index: number };

export type BodyPart = string | BodyVariable;

/** A Kululu Wording variable, for writing a body. */
export const valueVariable = (key: KululuValueKey): BodyVariable => ({
  kind: 'value',
  key,
});

/**
 * The fixed line between two of the Owner's paragraphs, on its own line.
 * Settled by Meta's approval of the probe templates on 2026-11-12.
 */
export const PARAGRAPH_SEPARATOR = '·';

/** The variables of a body, in the order Meta numbers them. */
export function bodyVariables(parts: readonly BodyPart[]): BodyVariable[] {
  return parts.filter((part): part is BodyVariable => typeof part !== 'string');
}

/** The body as Meta holds it: each variable as `{{n}}`, numbered from 1. */
export function metaBodyText(parts: readonly BodyPart[]): string {
  let n = 0;
  return parts
    .map((part) => (typeof part === 'string' ? part : `{{${++n}}}`))
    .join('');
}

/** The body as the Guest reads it, each variable replaced by its value in order. */
export function fillBody(
  parts: readonly BodyPart[],
  values: readonly string[],
): string {
  let n = 0;
  return parts
    .map((part) => (typeof part === 'string' ? part : (values[n++] ?? '')))
    .join('');
}

/** The Wrapper's two fixed lines around a Personal Message. */
export type Wrapper = { opening: string; closing: string };

/**
 * A Personal Message body: the Wrapper's opening line, a blank line, the
 * paragraphs with the separator on its own line between them, a blank line,
 * and the closing line. Exactly the bodies of section 3.2 of the meta-templates
 * doc.
 */
export function personalBody(
  wrapper: Wrapper,
  paragraphs: ParagraphCount,
): BodyPart[] {
  const parts: BodyPart[] = [`${wrapper.opening}\n\n`];
  for (let index = 0; index < paragraphs; index++) {
    if (index > 0) parts.push(`\n${PARAGRAPH_SEPARATOR}\n`);
    parts.push({ kind: 'paragraph', index });
  }
  parts.push(`\n\n${wrapper.closing}`);
  return parts;
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

/**
 * The two RSVP quick replies. Their text is exactly `confirmation_1`'s, because
 * the Confirmation Conversation matches on it
 * (src/features/confirmation/utils/typed-quick-reply.ts).
 */
export const RSVP_YES_TEXT = 'נגיע בשמחה';
export const RSVP_NO_TEXT = 'לא נוכל להגיע';
export const NAVIGATION_TEXT = 'ניווט לאירוע';
export const GIFT_TEXT = 'שליחת מתנה';

export type MessageButton =
  | { kind: 'quick_reply'; text: string; answer: 'yes' | 'no' }
  | { kind: 'url'; text: string; target: 'navigation' | 'gift' };

export const RSVP_BUTTONS: readonly MessageButton[] = [
  { kind: 'quick_reply', text: RSVP_YES_TEXT, answer: 'yes' },
  { kind: 'quick_reply', text: RSVP_NO_TEXT, answer: 'no' },
];

export const NAVIGATION_BUTTON: MessageButton = {
  kind: 'url',
  text: NAVIGATION_TEXT,
  target: 'navigation',
};

export const GIFT_BUTTON: MessageButton = {
  kind: 'url',
  text: GIFT_TEXT,
  target: 'gift',
};

/**
 * The URL each URL button was registered with on Meta. The dynamic suffix is
 * the Event's short code, as on `event_reminder_1`. The navigation page opens
 * Waze directly; the `/r/` page lists the Event's gifting links.
 */
export const META_URL_BUTTON_BASE = {
  navigation: 'https://kulu-lu.com/nav/',
  gift: 'https://kulu-lu.com/r/',
} as const;

/** The short code the URL buttons were submitted with as their example. */
export const META_URL_BUTTON_SAMPLE_SUFFIX = 'aB3xY9';

/**
 * The line each button becomes in the SMS, ahead of its link (brief section 8).
 * The SMS has no quick replies, so the Asks' two buttons become the one RSVP
 * link line.
 */
export const SMS_LINK_LABEL = {
  rsvp: 'לאישור הגעה',
  navigation: 'לניווט לאירוע',
  gift: 'לשליחת מתנה',
} as const;
