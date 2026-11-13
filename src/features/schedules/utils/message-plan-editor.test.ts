import { test } from 'node:test';
import assert from 'node:assert/strict';

import { serialisePersonalText } from '../message-plan';
import { weddingEvent } from '../message-plan/test-fixtures';
import {
  NO_TABLE_PREVIEW_ID,
  SAMPLE_PREVIEW_ID,
  attachmentOptions,
  emptyMessageFields,
  fromEditorDocument,
  toEditorDocument,
  paletteFields,
  personalTextErrorMessage,
  previewGuests,
  sentTables,
  sentWording,
  timingNote,
  tokenValue,
} from './message-plan-editor';

const personal = serialisePersonalText({
  paragraphs: [[{ kind: 'text', text: 'מחכים לכם' }]],
});

test('a Schedule sends its Personal Message only when it is chosen and not blank', () => {
  assert.equal(sentWording({ wording: 'personal', personalText: personal }), 'personal');
  assert.equal(sentWording({ wording: 'kululu', personalText: personal }), 'kululu');
  assert.equal(sentWording({ wording: 'personal', personalText: null }), 'kululu');
  assert.equal(
    sentWording({
      wording: 'personal',
      personalText: serialisePersonalText({ paragraphs: [[{ kind: 'text', text: '   ' }]] }),
    }),
    'kululu',
  );
  assert.equal(sentWording({ wording: null, personalText: null }), 'kululu');
});

test('an Invitation offers image, video and none, each only when the Event has it', () => {
  assert.deepEqual(attachmentOptions('invitation', weddingEvent()), [
    { value: 'image', available: true },
    { value: 'video', available: true },
    { value: 'none', available: true },
  ]);
  assert.deepEqual(
    attachmentOptions('invitation', weddingEvent({ invitations: null, invitationVideoUrl: null })),
    [
      { value: 'image', available: false },
      { value: 'video', available: false },
      { value: 'none', available: true },
    ],
  );
});

test('a Follow-up never offers the video', () => {
  assert.deepEqual(
    attachmentOptions('follow_up', weddingEvent()).map((option) => option.value),
    ['image', 'none'],
  );
});

test('an attachment link that does not parse is not offered', () => {
  const [image] = attachmentOptions('invitation', weddingEvent({ invitations: { imageUrl: 'not a url' } }));
  assert.equal(image.available, false);
});

test('a field with no value on the Event is reported empty; per-Guest fields never are', () => {
  assert.deepEqual(emptyMessageFields('invitation', weddingEvent()), []);
  assert.deepEqual(
    emptyMessageFields('event_reminder', weddingEvent({ ceremonyTime: null, location: null })),
    ['venueName', 'ceremonyTime'],
  );
});

test('the palette offers the ceremony time even without one, and the table only on the Reminder', () => {
  assert.ok(paletteFields('invitation').includes('ceremonyTime'));
  assert.ok(!paletteFields('invitation').includes('tableNumber'));
  assert.ok(paletteFields('event_reminder').includes('tableNumber'));
});

test('a token reads as the Event value, or flags an empty one', () => {
  assert.deepEqual(tokenValue('receptionTime', weddingEvent()), { value: '19:30', empty: false });
  assert.deepEqual(tokenValue('ceremonyTime', weddingEvent({ ceremonyTime: null })), {
    value: null,
    empty: true,
  });
  assert.deepEqual(tokenValue('guestName', weddingEvent()), { value: null, empty: false });
});

test('every validation error maps to a message key', () => {
  assert.deepEqual(personalTextErrorMessage({ code: 'too_long', length: 412, limit: 400 }), {
    key: 'tooLong',
    values: { over: 12, limit: 400 },
  });
  assert.deepEqual(personalTextErrorMessage({ code: 'empty_field', field: 'ceremonyTime' }), {
    key: 'emptyField',
    field: 'ceremonyTime',
    values: {},
  });
  assert.equal(
    personalTextErrorMessage({ code: 'too_many_paragraphs', count: 4, limit: 3 }).key,
    'tooManyParagraphs',
  );
  assert.equal(
    personalTextErrorMessage({ code: 'table_field_outside_sentence' }).key,
    'tableFieldOutsideSentence',
  );
});

const SAMPLE = { sampleName: 'דנה לוי', sampleTable: 12 };

test('with no Guests the preview shows the sample Guest', () => {
  const { presets, others } = previewGuests([], { offersTable: true, ...SAMPLE });
  assert.deepEqual(presets, [
    { id: SAMPLE_PREVIEW_ID, name: 'דנה לוי', table: { tableNumber: 12 }, tags: ['sample'] },
  ]);
  assert.deepEqual(others, []);
});

const guests = [
  { id: 'a', name: 'דן', table: { tableNumber: 3 } },
  { id: 'b', name: 'משפחת כהן מהעבודה של אבא', table: null },
  { id: 'c', name: 'רותי לוי', table: { tableNumber: 12 } },
  { id: 'd', name: 'יוסי', table: null },
];

test('on the Reminder the presets are a seated Guest, an unseated one and the longest name', () => {
  const { presets, others } = previewGuests(guests, { offersTable: true, ...SAMPLE });
  assert.deepEqual(
    presets.map((guest) => [guest.id, guest.tags]),
    [
      ['a', ['typical']],
      ['b', ['noTable', 'longestName']],
    ],
  );
  assert.deepEqual(
    others.map((guest) => guest.id),
    ['d', 'c'],
  );
});

test('when every Guest is seated, the no-table case is a made-up unseated copy', () => {
  const seated = guests.filter((guest) => guest.table);
  const { presets } = previewGuests(seated, { offersTable: true, ...SAMPLE });
  const noTable = presets.find((guest) => guest.tags.includes('noTable'));
  assert.equal(noTable?.id, NO_TABLE_PREVIEW_ID);
  assert.equal(noTable?.table, null);
});

test('a stage without tables offers no no-table preset', () => {
  const { presets } = previewGuests(guests, { offersTable: false, ...SAMPLE });
  assert.ok(presets.every((guest) => !guest.tags.includes('noTable')));
  assert.ok(presets.some((guest) => guest.tags.includes('longestName')));
});

test('tables are sent only on the Reminder, and only with the switch on', () => {
  const event = weddingEvent();
  assert.deepEqual(
    sentTables('event_reminder', guests, event).map((guest) => guest.table),
    guests.map((guest) => guest.table),
  );
  assert.ok(sentTables('invitation', guests, event).every((guest) => guest.table === null));
  const off = weddingEvent({ guestExperience: { sendTableNumbers: false } });
  assert.ok(sentTables('event_reminder', guests, off).every((guest) => guest.table === null));
});

test("the Reminder's timing line says which wording its day gives", () => {
  const eventDate = weddingEvent().eventDate;
  const base = { stage: 'event_reminder' as const, eventDate, wording: 'kululu' as const };
  assert.equal(timingNote({ ...base, scheduledDate: '2026-11-12T08:00:00.000Z' }), 'reminderToday');
  assert.equal(timingNote({ ...base, scheduledDate: '2026-11-10T08:00:00.000Z' }), 'reminderDated');
  assert.equal(timingNote({ ...base, scheduledDate: null }), 'reminderPickDay');
  assert.equal(
    timingNote({ ...base, wording: 'personal', scheduledDate: '2026-11-10T08:00:00.000Z' }),
    null,
  );
});

test('a Thank You after a Friday Event says Saturday becomes Sunday', () => {
  const base = { stage: 'thank_you' as const, scheduledDate: null, wording: 'kululu' as const };
  // 2026-11-13 is a Friday.
  assert.equal(timingNote({ ...base, eventDate: '2026-11-13T00:00:00.000Z' }), 'thankYouSunday');
  assert.equal(timingNote({ ...base, eventDate: '2026-11-12T00:00:00.000Z' }), null);
});

test('the table sentence is stored closing the last paragraph, and read back onto its own line', () => {
  const document = {
    paragraphs: [
      [{ kind: 'text' as const, text: 'היי ' }, { kind: 'field' as const, field: 'guestName' as const }],
      [{ kind: 'text' as const, text: 'נתראה' }],
      [],
    ],
    tableSentence: { before: 'השולחן שלכם: ', after: '!' },
  };
  const stored = fromEditorDocument(document);
  assert.deepEqual(stored.paragraphs[1], [
    { kind: 'text', text: 'נתראה' },
    { kind: 'text', text: ' ' },
    {
      kind: 'table_sentence',
      segments: [
        { kind: 'text', text: 'השולחן שלכם: ' },
        { kind: 'field', field: 'tableNumber' },
        { kind: 'text', text: '!' },
      ],
    },
  ]);
  assert.equal(stored.paragraphs.length, 2, 'the empty paragraph is dropped');
  const back = toEditorDocument(stored);
  assert.deepEqual(back.tableSentence, { before: 'השולחן שלכם: ', after: '!' });
  assert.equal(back.paragraphs.length, 2);
});

test('a table sentence alone is its own paragraph', () => {
  const stored = fromEditorDocument({ paragraphs: [], tableSentence: { before: 'שולחן ', after: '' } });
  assert.deepEqual(stored.paragraphs, [
    [
      {
        kind: 'table_sentence',
        segments: [
          { kind: 'text', text: 'שולחן ' },
          { kind: 'field', field: 'tableNumber' },
        ],
      },
    ],
  ]);
});
