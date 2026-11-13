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
  effectiveTable,
  fillValue,
  isBlankPersonalText,
  longestGuestName,
  messageField,
  messageFieldsFor,
  parsePersonalText,
  stageOffersTable,
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
import { isGiftingEnabled } from './event-config';
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

export type AttachmentOption = {
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

/** Whether the gift switch can be on: the Event's Gifting page is set up. */
export function giftAvailable(event: Pick<MessagePlanEvent, 'eventSettings'>): boolean {
  return isGiftingEnabled(event.eventSettings);
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
export type PersonalTextErrorMessage = {
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

export type PreviewGuestTag = 'typical' | 'noTable' | 'longestName' | 'sample';

export type PreviewGuest = {
  /** The Guest Record's id, or a made-up one for a Guest that is not on the list. */
  id: string;
  name: string;
  table: MessagePlanGuestTable | null;
  tags: PreviewGuestTag[];
};

export type PreviewGuestSource = {
  id: string;
  name: string;
  table: MessagePlanGuestTable | null;
};

/** The id of the made-up unseated Guest, shown when every real Guest has a table. */
export const NO_TABLE_PREVIEW_ID = 'preview-no-table';
export const SAMPLE_PREVIEW_ID = 'preview-sample';

/**
 * The Guests the preview offers (brief 8). The presets lead: a typical Guest
 * (seated, when the stage sends tables, with a name of middling length), one
 * with no table on a stage that sends tables, and the longest name, where a
 * messy name shows. The rest of the list follows, by name. With no Guests at
 * all the preview shows the sample Guest. With every Guest seated, the
 * no-table case is the typical Guest without a table, so the Owner still
 * sees what that Guest gets.
 *
 * `offersTable`: the stage sends tables and the Event's switch is on.
 */
export function previewGuests(
  guests: readonly PreviewGuestSource[],
  options: { offersTable: boolean; sampleName: string; sampleTable: number },
): { presets: PreviewGuest[]; others: PreviewGuest[] } {
  const named = guests.filter((guest) => guest.name.trim() !== '');
  if (named.length === 0) {
    return {
      presets: [
        {
          id: SAMPLE_PREVIEW_ID,
          name: options.sampleName,
          table: options.offersTable ? { tableNumber: options.sampleTable } : null,
          tags: ['sample'],
        },
      ],
      others: [],
    };
  }

  const presets = new Map<string, PreviewGuest>();
  const add = (guest: PreviewGuestSource, tag: PreviewGuestTag) => {
    const existing = presets.get(guest.id);
    if (existing) existing.tags.push(tag);
    else presets.set(guest.id, { ...guest, tags: [tag] });
  };

  const seated = named.filter((guest) => guest.table !== null);
  const pool = options.offersTable && seated.length ? seated : named;
  const typical = middleByLength(pool);
  add(typical, 'typical');

  if (options.offersTable) {
    const unseated = named.find((guest) => guest.table === null);
    if (unseated) add(unseated, 'noTable');
    else
      presets.set(NO_TABLE_PREVIEW_ID, {
        id: NO_TABLE_PREVIEW_ID,
        name: typical.name,
        table: null,
        tags: ['noTable'],
      });
  }

  const longest = longestGuestName(named.map((guest) => guest.name));
  const longestGuest = named.find((guest) => guest.name.trim() === longest);
  if (longestGuest) add(longestGuest, 'longestName');

  const others = named
    .filter((guest) => !presets.has(guest.id))
    .map((guest) => ({ ...guest, tags: [] }))
    .sort((a, b) => a.name.localeCompare(b.name, 'he'));

  return { presets: [...presets.values()], others };
}

/** The Guest whose name is the median length: a name that reads like most. */
function middleByLength<T extends { name: string }>(guests: readonly T[]): T {
  const sorted = [...guests].sort(
    (a, b) => characterCount(a.name.trim()) - characterCount(b.name.trim()),
  );
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

/**
 * The tables the Event's Guests are sent, for the character count and the
 * save: none at all when the Event's "send table numbers" switch is off, or
 * on a stage that sends no table.
 */
export function sentTables<G extends { table: MessagePlanGuestTable | null }>(
  stage: Stage,
  guests: readonly G[],
  event: MessagePlanEvent,
): G[] {
  return guests.map((guest) => ({
    ...guest,
    table: stageOffersTable(stage) ? effectiveTable(guest, event) : null,
  }));
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

export const EMPTY_EDITOR_DOCUMENT: EditorDocument = { paragraphs: [], tableSentence: null };

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

/** The fields placed in a document, each once, in order. */
export function placedFields(document: EditorDocument): MessageFieldKey[] {
  const fields: MessageFieldKey[] = [];
  for (const segment of document.paragraphs.flat()) {
    if (segment.kind === 'field' && !fields.includes(segment.field)) fields.push(segment.field);
  }
  if (document.tableSentence && !fields.includes('tableNumber')) fields.push('tableNumber');
  return fields;
}
