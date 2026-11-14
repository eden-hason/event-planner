/**
 * The Owner's Personal Message (ADR 0054): how it is stored, cleaned, filled
 * for a Guest, counted and checked before it is saved.
 *
 * ## Stored format (`schedules.personal_text`)
 *
 * One JSON document, version 1:
 *
 *   {"v":1,"p":[
 *     ["דנה ", {"f":"guestName"}, " יקרה, מחכים לך"],
 *     ["נתראה ב", {"f":"venueName"}, ". ", {"t":["השולחן שלכם: ", {"f":"tableNumber"}]}]
 *   ]}
 *
 * `p` holds the paragraphs in order. A paragraph is a list of segments: a
 * string is text the Owner typed, `{"f": key}` is a Message Field, and
 * `{"t": [...]}` is the table sentence, holding text and fields of its own.
 *
 * Why JSON rather than a markup with tokens in the text: a token is a
 * different kind of value, not a spelling, so nothing an Owner types can ever
 * be read back as one - "{{guestName}}", "[שם האורח]" or a brace typed by hand
 * stay text, with no escaping rule to get wrong. It round-trips exactly, it is
 * what an editor's document model serialises to anyway, and the version tag
 * leaves room to change it. The cost is a few bytes per token, far inside the
 * column's 4000-character check for a 400-character message.
 *
 * A value that is not a version 1 document (empty, hand-written plain text)
 * is read as plain text, one paragraph per line, so nothing stored is ever
 * unreadable.
 */

import {
  fillValue,
  isMessageFieldKey,
  messageField,
  stageOffersTable,
  type FillContext,
  type MessageFieldKey,
} from './fields';
import type { Stage } from './shape';
import type { MessagePlanEvent } from './types';

export const PERSONAL_TEXT_MAX_LENGTH = 400;
export const PERSONAL_TEXT_MAX_PARAGRAPHS = 3;

export type PersonalSegment =
  | { kind: 'text'; text: string }
  | { kind: 'field'; field: MessageFieldKey };

export type PersonalTableSentence = {
  kind: 'table_sentence';
  segments: PersonalSegment[];
};

export type PersonalBlock = PersonalSegment | PersonalTableSentence;

export type PersonalParagraph = PersonalBlock[];

export type PersonalText = { paragraphs: PersonalParagraph[] };

// ─── Parse and serialise ─────────────────────────────────────────────────────

type StoredSegment = string | { f: string };
type StoredBlock = StoredSegment | { t: StoredSegment[] };
type StoredDocument = { v: 1; p: StoredBlock[][] };

function decodeSegment(value: unknown): PersonalSegment | null {
  if (typeof value === 'string') return { kind: 'text', text: value };
  if (value && typeof value === 'object' && 'f' in value) {
    const field = (value as { f: unknown }).f;
    // A field this code no longer knows is dropped rather than shown as text.
    return isMessageFieldKey(field) ? { kind: 'field', field } : null;
  }
  return null;
}

function decodeBlock(value: unknown): PersonalBlock | null {
  if (value && typeof value === 'object' && 't' in value) {
    const raw = (value as { t: unknown }).t;
    if (!Array.isArray(raw)) return null;
    const segments = raw
      .map(decodeSegment)
      .filter((s): s is PersonalSegment => s !== null);
    return { kind: 'table_sentence', segments };
  }
  return decodeSegment(value);
}

function plainTextDocument(raw: string): PersonalText {
  return {
    paragraphs: raw
      .split(/\r?\n/)
      .map((line) => [{ kind: 'text', text: line }]),
  };
}

/** Reads `schedules.personal_text`. Never throws. */
export function parsePersonalText(
  raw: string | null | undefined,
): PersonalText {
  if (!raw || !raw.trim()) return { paragraphs: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return plainTextDocument(raw);
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as { v?: unknown }).v !== 1 ||
    !Array.isArray((parsed as { p?: unknown }).p)
  ) {
    return plainTextDocument(raw);
  }
  const paragraphs = (parsed as { p: unknown[] }).p
    .filter(Array.isArray)
    .map((blocks) =>
      (blocks as unknown[])
        .map(decodeBlock)
        .filter((b): b is PersonalBlock => b !== null),
    );
  return { paragraphs };
}

function encodeSegment(segment: PersonalSegment): StoredSegment {
  return segment.kind === 'text' ? segment.text : { f: segment.field };
}

/** Writes `schedules.personal_text`. `parsePersonalText` reads it back unchanged. */
export function serialisePersonalText(text: PersonalText): string {
  const document: StoredDocument = {
    v: 1,
    p: text.paragraphs.map((paragraph) =>
      paragraph.map((block) =>
        block.kind === 'table_sentence'
          ? { t: block.segments.map(encodeSegment) }
          : encodeSegment(block),
      ),
    ),
  };
  return JSON.stringify(document);
}

// ─── Cleaning ────────────────────────────────────────────────────────────────

/**
 * What Meta refuses in a body parameter, made harmless: `{{` and `}}` (read as
 * template syntax), line breaks and tabs (132018), and runs of spaces. A
 * paragraph is one line, so a line break inside one becomes a space. Every
 * kind of white space counts (a non-breaking space, U+2028), since a paste
 * from another app brings them in.
 */
export function cleanText(value: string): string {
  return value
    .replace(/\{\{+/g, '{')
    .replace(/\}\}+/g, '}')
    .replace(/\s+/gu, ' ');
}

function mergeText(segments: PersonalSegment[]): PersonalSegment[] {
  const merged: PersonalSegment[] = [];
  for (const segment of segments) {
    const last = merged[merged.length - 1];
    if (segment.kind === 'text' && last?.kind === 'text') {
      merged[merged.length - 1] = {
        kind: 'text',
        text: last.text + segment.text,
      };
    } else {
      merged.push(segment);
    }
  }
  return merged
    .map((s) =>
      s.kind === 'text'
        ? { kind: 'text' as const, text: cleanText(s.text) }
        : s,
    )
    .filter((s) => s.kind !== 'text' || s.text !== '');
}

function normaliseParagraph(paragraph: PersonalParagraph): PersonalParagraph {
  const blocks: PersonalBlock[] = [];
  let run: PersonalSegment[] = [];
  const flush = () => {
    blocks.push(...mergeText(run));
    run = [];
  };
  for (const block of paragraph) {
    if (block.kind === 'table_sentence') {
      flush();
      const segments = mergeText(block.segments);
      if (segments.some((s) => s.kind === 'field' || s.text.trim())) {
        blocks.push({ kind: 'table_sentence', segments });
      }
    } else {
      run.push(block);
    }
  }
  flush();

  // Trim the paragraph's ends.
  const first = blocks[0];
  if (first?.kind === 'text')
    blocks[0] = { kind: 'text', text: first.text.trimStart() };
  const lastIndex = blocks.length - 1;
  const last = blocks[lastIndex];
  if (last?.kind === 'text')
    blocks[lastIndex] = { kind: 'text', text: last.text.trimEnd() };
  return blocks.filter((b) => b.kind !== 'text' || b.text !== '');
}

/**
 * Cleans every typed text and collapses empty paragraphs, so the Guest never
 * sees a gap. More than three paragraphs are kept: saving refuses them
 * (`validatePersonalText`), and a send folds them (`fillPersonalText`).
 */
export function normalisePersonalText(text: PersonalText): PersonalText {
  return {
    paragraphs: text.paragraphs
      .map(normaliseParagraph)
      .filter((p) => p.length > 0),
  };
}

/** A Personal Message left blank is no Personal Message: the Kululu Wording is sent. */
export function isBlankPersonalText(text: PersonalText): boolean {
  return normalisePersonalText(text).paragraphs.length === 0;
}

// ─── Filling ─────────────────────────────────────────────────────────────────

function fillSegments(
  segments: PersonalSegment[],
  context: FillContext,
): string {
  return segments
    .map((s) =>
      s.kind === 'text' ? s.text : (fillValue(s.field, context) ?? ''),
    )
    .join('');
}

/**
 * The Owner's paragraphs for one Guest, ready to be the template's paragraph
 * parameters: every field filled (a value that is empty now is sent empty,
 * ADR 0054), the table sentence left out for a Guest with no table, and any
 * paragraph that this leaves empty dropped. Dropping one changes the number
 * of paragraphs, and so the template.
 *
 * Each paragraph comes out cleaned and on one line. A stored text with more
 * than three paragraphs, which saving refuses, has the extras joined onto the
 * third rather than lost.
 */
export function fillPersonalText(
  text: PersonalText,
  context: FillContext,
): string[] {
  const filled = normalisePersonalText(text)
    .paragraphs.map((paragraph) =>
      paragraph
        .map((block) => {
          if (block.kind !== 'table_sentence')
            return fillSegments([block], context);
          return context.guest?.table
            ? fillSegments(block.segments, context)
            : '';
        })
        .join(''),
    )
    .map((paragraph) => cleanText(paragraph).trim())
    .filter((paragraph) => paragraph !== '');

  if (filled.length <= PERSONAL_TEXT_MAX_PARAGRAPHS) return filled;
  const kept = filled.slice(0, PERSONAL_TEXT_MAX_PARAGRAPHS - 1);
  kept.push(filled.slice(PERSONAL_TEXT_MAX_PARAGRAPHS - 1).join(' '));
  return kept;
}

// ─── Counting ────────────────────────────────────────────────────────────────

/** Characters as a person counts them: code points, so an emoji is not two. */
export function characterCount(value: string): number {
  return [...value].length;
}

/**
 * The length the 400-character limit is checked against: only what the Owner
 * typed, the table sentence's words included. Message Fields count nothing,
 * whatever they fill in to, and the Wrapper and separators are left out
 * (ADR 0054). The fields on offer are short enough that a full 400 with every
 * field placed stays far under Meta's 1,024-character body.
 */
export function personalTextLength(text: PersonalText): number {
  let length = 0;
  for (const paragraph of normalisePersonalText(text).paragraphs) {
    for (const block of paragraph) {
      const segments = block.kind === 'table_sentence' ? block.segments : [block];
      for (const segment of segments) {
        if (segment.kind === 'text') length += characterCount(segment.text);
      }
    }
  }
  return length;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export type PersonalTextError =
  | { code: 'too_long'; length: number; limit: number }
  | { code: 'too_many_paragraphs'; count: number; limit: number }
  /** A field placed in the text has no value on the Event right now. */
  | { code: 'empty_field'; field: MessageFieldKey }
  /** A field the stage does not offer (the table outside the Reminder). */
  | { code: 'field_not_offered'; field: MessageFieldKey }
  | { code: 'table_sentence_outside_reminder' }
  | { code: 'more_than_one_table_sentence' }
  /** The table field placed outside the table sentence. */
  | { code: 'table_field_outside_sentence' };

export type PersonalTextValidation =
  | { ok: true; text: PersonalText; length: number; blank: boolean }
  | { ok: false; errors: PersonalTextError[]; length: number };

/**
 * Whether a Personal Message may be saved, checked on its cleaned form. Every
 * problem is reported, in a stable order, so the editor can mark each token
 * and the Save bar can say why. A blank text is valid: it means the Kululu
 * Wording.
 *
 */
export function validatePersonalText(
  input: PersonalText,
  options: {
    stage: Stage;
    event: MessagePlanEvent;
  },
): PersonalTextValidation {
  const text = normalisePersonalText(input);
  const errors: PersonalTextError[] = [];

  if (text.paragraphs.length > PERSONAL_TEXT_MAX_PARAGRAPHS) {
    errors.push({
      code: 'too_many_paragraphs',
      count: text.paragraphs.length,
      limit: PERSONAL_TEXT_MAX_PARAGRAPHS,
    });
  }

  let tableSentences = 0;
  const placed: { field: MessageFieldKey; inSentence: boolean }[] = [];
  for (const block of text.paragraphs.flat()) {
    if (block.kind === 'field')
      placed.push({ field: block.field, inSentence: false });
    if (block.kind !== 'table_sentence') continue;
    tableSentences++;
    for (const segment of block.segments) {
      if (segment.kind === 'field')
        placed.push({ field: segment.field, inSentence: true });
    }
  }

  if (tableSentences > 0 && !stageOffersTable(options.stage)) {
    errors.push({ code: 'table_sentence_outside_reminder' });
  }
  if (tableSentences > 1) errors.push({ code: 'more_than_one_table_sentence' });

  if (
    placed.some((p) => messageField(p.field).tableSentenceOnly && !p.inSentence)
  ) {
    errors.push({ code: 'table_field_outside_sentence' });
  }

  const seen = new Set<MessageFieldKey>();
  for (const { field } of placed) {
    if (seen.has(field)) continue;
    seen.add(field);
    const definition = messageField(field);
    if (!definition.stages.includes(options.stage)) {
      errors.push({ code: 'field_not_offered', field });
      continue;
    }
    if (
      !definition.perGuest &&
      fillValue(field, { event: options.event, guest: null }) === null
    ) {
      errors.push({ code: 'empty_field', field });
    }
  }

  const length = personalTextLength(text);
  if (length > PERSONAL_TEXT_MAX_LENGTH) {
    errors.push({ code: 'too_long', length, limit: PERSONAL_TEXT_MAX_LENGTH });
  }

  return errors.length
    ? { ok: false, errors, length }
    : { ok: true, text, length, blank: text.paragraphs.length === 0 };
}
