/**
 * The view model of the Owner's screens on the current Message Plan (ADR 0053,
 * 0054): which message a Schedule sends, what its attachment and gift switch
 * may offer, which Message Fields are empty, the Guests the preview can show,
 * and what the timing card says. Pure, so the page, the client cards and the
 * tests read one rule.
 */

import { addCalendarDays } from '@/lib/date-time';

import {
  FOLLOW_UP_ATTACHMENTS,
  INVITATION_ATTACHMENTS,
  characterCount,
  effectiveAttachment,
  fillValue,
  isBlankPersonalText,
  messageField,
  messageFieldsFor,
  parsePersonalText,
  type Attachment,
  type MessageFieldKey,
  type MessagePlanEvent,
  type MessagePlanGuestTable,
  type PersonalParagraph,
  type PersonalSegment,
  type PersonalTableSentence,
  type PersonalText,
  type PersonalTextError,
  type Stage,
  type Wording,
} from '../message-plan';
import { eventDay, reminderDayFor, thankYouDay } from './message-plan-dates';

// ─── Which message ───────────────────────────────────────────────────────────

/**
 * What a Schedule actually sends: the Owner's own message only when it is
 * chosen and has something in it. A blank Personal Message is no Personal
 * Message (ADR 0054), so the list says Kululu's text for it.
 */
export function sentWording(schedule: {
  wording?: Wording | null;
  personalText?: string | null;
}): Wording {
  return schedule.wording === 'personal' &&
    !isBlankPersonalText(parsePersonalText(schedule.personalText))
    ? 'personal'
    : 'kululu';
}

// ─── Attachment and gift ─────────────────────────────────────────────────────

type AttachmentOption = {
  value: Attachment;
  /** The Event has it now. "none" always is. */
  available: boolean;
};

/**
 * The attachments an Ask offers, in order, each saying whether the Event has
 * it. The Follow-up never offers the video. Availability is the renderer's
 * own rule (`effectiveAttachment`), so the card never offers what the send
 * would drop.
 */
export function attachmentOptions(
  stage: 'invitation' | 'follow_up',
  event: Pick<MessagePlanEvent, 'invitations' | 'invitationVideoUrl'>,
): AttachmentOption[] {
  const offered: readonly Attachment[] =
    stage === 'invitation' ? INVITATION_ATTACHMENTS : FOLLOW_UP_ATTACHMENTS;
  return offered.map((value) => ({
    value,
    available: value === 'none' || effectiveAttachment(stage, value, event) === value,
  }));
}

// ─── Message Fields ──────────────────────────────────────────────────────────

/**
 * The fields offered on a stage that have no value on the Event right now
 * (a missing ceremony time, no venue). They can be placed but not saved
 * (brief 7.3). Per-Guest fields are never empty at save time.
 */
export function emptyMessageFields(
  stage: Stage,
  event: MessagePlanEvent,
): MessageFieldKey[] {
  return messageFieldsFor(stage)
    .filter(
      (field) => !field.perGuest && fillValue(field.key, { event, guest: null }) === null,
    )
    .map((field) => field.key);
}

/**
 * The palette for a stage: every field it offers, the ceremony time included
 * even when the Event has none (it can be placed, and then flagged), so the
 * Owner learns the fact exists.
 */
export function paletteFields(stage: Stage): MessageFieldKey[] {
  return messageFieldsFor(stage).map((field) => field.key);
}

/**
 * What a token reads as in the editor: the Event's value when it has one.
 * Null for a per-Guest field (it reads as its name, since it differs per
 * Guest) and for a field the Event has no value for (flagged).
 */
export function tokenValue(
  field: MessageFieldKey,
  event: MessagePlanEvent,
): { value: string | null; empty: boolean } {
  if (messageField(field).perGuest) return { value: null, empty: false };
  const value = fillValue(field, { event, guest: null });
  return { value, empty: value === null };
}

// ─── Validation messages ─────────────────────────────────────────────────────

/** An i18n key under `schedules.messagePlan.errors`, and its values. */
type PersonalTextErrorMessage = {
  key:
    | 'tooLong'
    | 'tooManyParagraphs'
    | 'emptyField'
    | 'fieldNotOffered'
    | 'tableSentenceOutsideReminder'
    | 'moreThanOneTableSentence'
    | 'tableFieldOutsideSentence';
  /** The field the message names, translated by the caller. */
  field?: MessageFieldKey;
  values: Record<string, number>;
};

/** Maps a `validatePersonalText` error to the message the Owner reads. */
export function personalTextErrorMessage(
  error: PersonalTextError,
): PersonalTextErrorMessage {
  switch (error.code) {
    case 'too_long':
      return {
        key: 'tooLong',
        values: { over: error.length - error.limit, limit: error.limit },
      };
    case 'too_many_paragraphs':
      return { key: 'tooManyParagraphs', values: { limit: error.limit } };
    case 'empty_field':
      return { key: 'emptyField', field: error.field, values: {} };
    case 'field_not_offered':
      return { key: 'fieldNotOffered', field: error.field, values: {} };
    case 'table_sentence_outside_reminder':
      return { key: 'tableSentenceOutsideReminder', values: {} };
    case 'more_than_one_table_sentence':
      return { key: 'moreThanOneTableSentence', values: {} };
    case 'table_field_outside_sentence':
      return { key: 'tableFieldOutsideSentence', values: {} };
  }
}

// ─── Guests the preview shows ────────────────────────────────────────────────

export type PreviewGuest = {
  /** The Guest Record's id, or a made-up one for the sample Guest. */
  id: string;
  name: string;
  table: MessagePlanGuestTable | null;
  /** True for the made-up Guest shown when the Event has no Guests yet. */
  sample: boolean;
};

export type PreviewGuestSource = {
  id: string;
  name: string;
  table: MessagePlanGuestTable | null;
};

export const SAMPLE_PREVIEW_ID = 'preview-sample';

/**
 * The one Guest the preview shows (brief 8): a typical Guest, seated when the
 * stage sends tables, with a name of middling length. With no Guests at all,
 * the sample Guest.
 *
 * `offersTable`: the stage sends tables and the Event's switch is on.
 */
export function previewGuest(
  guests: readonly PreviewGuestSource[],
  options: { offersTable: boolean; sampleName: string; sampleTable: number },
): PreviewGuest {
  const named = guests.filter((guest) => guest.name.trim() !== '');
  if (named.length === 0) {
    return {
      id: SAMPLE_PREVIEW_ID,
      name: options.sampleName,
      table: options.offersTable ? { tableNumber: options.sampleTable } : null,
      sample: true,
    };
  }
  const seated = named.filter((guest) => guest.table !== null);
  const pool = options.offersTable && seated.length ? seated : named;
  return { ...middleByLength(pool), sample: false };
}

/** The Guest whose name is the median length: a name that reads like most. */
function middleByLength<T extends { name: string }>(guests: readonly T[]): T {
  const sorted = guests
    .map((guest) => ({ guest, length: characterCount(guest.name.trim()) }))
    .sort((a, b) => a.length - b.length);
  return sorted[Math.floor((sorted.length - 1) / 2)].guest;
}

// ─── Timing ──────────────────────────────────────────────────────────────────

/**
 * The line under the timing card on the current plan (brief 6.5): which
 * wording the Reminder's day gives, and why a Thank You after a Friday Event
 * goes out on Sunday. Null when there is nothing to say.
 */
export type TimingNote =
  | 'reminderToday'
  | 'reminderDated'
  | 'reminderPickDay'
  | 'thankYouSunday'
  | null;

export function timingNote(params: {
  stage: Stage;
  eventDate: string | null;
  scheduledDate: string | null;
  wording: Wording;
}): TimingNote {
  const { stage, eventDate, scheduledDate } = params;
  if (!eventDate) return null;
  if (stage === 'event_reminder') {
    // The Owner's own message reads the same on any day (ADR 0054).
    if (params.wording === 'personal') return null;
    if (!scheduledDate) return 'reminderPickDay';
    const day = reminderDayFor(scheduledDate, eventDate);
    if (day === 'today') return 'reminderToday';
    if (day === 'dated') return 'reminderDated';
    return null;
  }
  if (stage === 'thank_you') {
    return thankYouDay(eventDate) !== addCalendarDays(eventDay(eventDate), 1)
      ? 'thankYouSunday'
      : null;
  }
  return null;
}

// ─── The editor's document ───────────────────────────────────────────────────

/**
 * The Personal Message as the editor holds it: the Owner's paragraphs, and on
 * the Reminder the table sentence on a line of its own below them, typed
 * text around the one fixed table token. It is stored at the end of the last
 * paragraph, so a seated Guest reads it as part of that paragraph and an
 * unseated one does not get it at all (brief 7.4).
 */
export type EditorDocument = {
  paragraphs: PersonalSegment[][];
  tableSentence: { before: string; after: string } | null;
};

/** The stored text as the editor shows it. Only the first table sentence is kept. */
export function toEditorDocument(text: PersonalText): EditorDocument {
  let tableSentence: EditorDocument['tableSentence'] = null;
  const paragraphs = text.paragraphs.map((paragraph) => {
    const segments: PersonalSegment[] = [];
    for (const block of paragraph) {
      if (block.kind !== 'table_sentence') {
        segments.push(block);
        continue;
      }
      if (tableSentence) continue;
      const at = block.segments.findIndex(
        (segment) => segment.kind === 'field' && segment.field === 'tableNumber',
      );
      const textOf = (segments: PersonalSegment[]) =>
        segments.map((segment) => (segment.kind === 'text' ? segment.text : '')).join('');
      tableSentence =
        at === -1
          ? { before: textOf(block.segments), after: '' }
          : {
              before: textOf(block.segments.slice(0, at)),
              after: textOf(block.segments.slice(at + 1)),
            };
    }
    return segments;
  });
  return { paragraphs, tableSentence };
}

/** The editor's document as it is stored, the table sentence closing the last paragraph. */
export function fromEditorDocument(document: EditorDocument): PersonalText {
  const paragraphs: PersonalParagraph[] = document.paragraphs
    .map((paragraph) => [...paragraph])
    .filter((paragraph) =>
      paragraph.some((segment) => segment.kind === 'field' || segment.text.trim() !== ''),
    );
  if (document.tableSentence) {
    const { before, after } = document.tableSentence;
    const sentence: PersonalTableSentence = {
      kind: 'table_sentence',
      segments: [
        ...(before ? [{ kind: 'text' as const, text: before }] : []),
        { kind: 'field' as const, field: 'tableNumber' as const },
        ...(after ? [{ kind: 'text' as const, text: after }] : []),
      ],
    };
    const last = paragraphs[paragraphs.length - 1];
    if (last) {
      const tail = last[last.length - 1];
      const spaced = tail?.kind === 'text' && /\s$/u.test(tail.text);
      if (!spaced) last.push({ kind: 'text', text: ' ' });
      last.push(sentence);
    } else {
      paragraphs.push([sentence]);
    }
  }
  return { paragraphs };
}

// ─── What every pane of a kind is handed ─────────────────────────────────────

/**
 * The Guests as a stage reads them, worked out once per kind of stage: with
 * their tables when the stage sends tables (the Reminder, with the Event's
 * switch on), without otherwise. The preview gets its one Guest.
 */
export function stageGuests(
  guests: readonly PreviewGuestSource[],
  options: { offersTable: boolean; sampleName: string; sampleTable: number },
): { preview: PreviewGuest } {
  const sent = options.offersTable ? guests : guests.map((guest) => ({ ...guest, table: null }));
  return { preview: previewGuest(sent, options) };
}
