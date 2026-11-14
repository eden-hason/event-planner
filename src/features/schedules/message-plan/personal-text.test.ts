import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PERSONAL_TEXT_MAX_LENGTH,
  cleanText,
  fillPersonalText,
  isBlankPersonalText,
  normalisePersonalText,
  parsePersonalText,
  personalTextLength,
  serialisePersonalText,
  validatePersonalText,
  type PersonalText,
} from './personal-text';
import type { MessageFieldKey } from './fields';
import { SEATED, UNSEATED, weddingEvent } from './test-fixtures';

const t = (text: string) => ({ kind: 'text' as const, text });
const f = (field: MessageFieldKey) => ({ kind: 'field' as const, field });
const tableSentence = (...segments: ReturnType<typeof t | typeof f>[]) => ({
  kind: 'table_sentence' as const,
  segments,
});

const REMINDER_TEXT: PersonalText = {
  paragraphs: [
    [t('היי '), f('guestName'), t(', מחכים לך ב'), f('venueName')],
    [tableSentence(t('השולחן שלכם: '), f('tableNumber'))],
    [t('רוקדים עד הבוקר!')],
  ],
};

test('the stored format survives a round trip', () => {
  const stored = serialisePersonalText(REMINDER_TEXT);
  assert.deepEqual(parsePersonalText(stored), REMINDER_TEXT);
  assert.equal(serialisePersonalText(parsePersonalText(stored)), stored);
  assert.deepEqual(JSON.parse(stored).p[1], [
    { t: ['השולחן שלכם: ', { f: 'tableNumber' }] },
  ]);
});

test('text that looks like a token stays text', () => {
  const text: PersonalText = {
    paragraphs: [[t('{{guestName}} {"f":"venueName"} [שם האורח] {{1}}')]],
  };
  const back = parsePersonalText(serialisePersonalText(text));
  assert.deepEqual(back, text);
  assert.deepEqual(
    fillPersonalText(back, { event: weddingEvent(), guest: SEATED }),
    ['{guestName} {"f":"venueName"} [שם האורח] {1}'],
  );
});

test('anything that is not a version 1 document reads as plain text, one paragraph per line', () => {
  assert.deepEqual(parsePersonalText(null), { paragraphs: [] });
  assert.deepEqual(parsePersonalText('   '), { paragraphs: [] });
  assert.deepEqual(parsePersonalText('שורה אחת\nשורה שתיים'), {
    paragraphs: [[t('שורה אחת')], [t('שורה שתיים')]],
  });
  assert.deepEqual(parsePersonalText('{"v":2,"p":[]}'), {
    paragraphs: [[t('{"v":2,"p":[]}')]],
  });
  assert.deepEqual(parsePersonalText('["a"]'), { paragraphs: [[t('["a"]')]] });
  // An unknown field is dropped, not shown as text.
  assert.deepEqual(parsePersonalText('{"v":1,"p":[["a",{"f":"nope"}]]}'), {
    paragraphs: [[t('a')]],
  });
});

test('cleaning removes template syntax, tabs, line breaks and runs of spaces', () => {
  assert.equal(
    cleanText('a {{1}} b }}} c\t\td\n\ne     f'),
    'a {1} b } c d e f',
  );
  // White space a paste brings in: non-breaking spaces and U+2028.
  assert.equal(cleanText('a\u00a0\u00a0b\u2028c\u00a0d'), 'a b c d');
  const normalised = normalisePersonalText({
    paragraphs: [
      [t('  שלום\t'), t('  לכולם  '), f('guestName'), t('   ')],
      [t('  ')],
      [],
      [t('\n')],
    ],
  });
  assert.deepEqual(normalised, {
    paragraphs: [[t('שלום לכולם '), f('guestName')]],
  });
});

test('empty paragraphs collapse and a blank text is no Personal Message', () => {
  const text: PersonalText = { paragraphs: [[t('א')], [t('   ')], [t('ב')]] };
  assert.deepEqual(
    fillPersonalText(text, { event: weddingEvent(), guest: SEATED }),
    ['א', 'ב'],
  );
  assert.equal(isBlankPersonalText({ paragraphs: [[t(' \t ')], []] }), true);
  assert.equal(isBlankPersonalText({ paragraphs: [[f('guestName')]] }), false);
});

test('fields are filled for the Guest; an empty one is sent empty', () => {
  const event = weddingEvent({ ceremonyTime: null });
  const text: PersonalText = {
    paragraphs: [
      [f('guestName'), t(' - חופה ב'), f('ceremonyTime'), t(' בדיוק')],
    ],
  };
  assert.deepEqual(fillPersonalText(text, { event, guest: SEATED }), [
    'דנה לוי - חופה ב בדיוק',
  ]);
});

test('the table sentence drops for a Guest with no table, and its paragraph with it', () => {
  const event = weddingEvent();
  assert.deepEqual(fillPersonalText(REMINDER_TEXT, { event, guest: SEATED }), [
    'היי דנה לוי, מחכים לך באולמי הגן, ראשון לציון',
    'השולחן שלכם: 12',
    'רוקדים עד הבוקר!',
  ]);
  assert.deepEqual(
    fillPersonalText(REMINDER_TEXT, { event, guest: UNSEATED }),
    ['היי דנה לוי, מחכים לך באולמי הגן, ראשון לציון', 'רוקדים עד הבוקר!'],
  );
  const inline: PersonalText = {
    paragraphs: [
      [t('נתראה! '), tableSentence(t('שולחן '), f('tableNumber')), t(' 🎉')],
    ],
  };
  assert.deepEqual(fillPersonalText(inline, { event, guest: UNSEATED }), [
    'נתראה! 🎉',
  ]);
});

test('a stored text with more than three paragraphs folds the extras into the third', () => {
  const text: PersonalText = {
    paragraphs: [[t('1')], [t('2')], [t('3')], [t('4')]],
  };
  assert.deepEqual(
    fillPersonalText(text, { event: weddingEvent(), guest: SEATED }),
    ['1', '2', '3 4'],
  );
});

test('the length counts only what the Owner typed, without fields, Wrapper or separators', () => {
  const text: PersonalText = {
    paragraphs: [
      [t('שלום '), f('guestName')],
      [tableSentence(t('שולחן '), f('tableNumber'))],
      [t('🎉🎉')],
    ],
  };
  assert.equal(personalTextLength(text), 5 + 6 + 2);
});

function textOfLength(length: number): PersonalText {
  return {
    paragraphs: [[f('guestName'), t('א'.repeat(length)), f('venueName')]],
  };
}

test('400 typed characters is the limit, whatever the fields fill in to', () => {
  const event = weddingEvent();
  const at = validatePersonalText(textOfLength(PERSONAL_TEXT_MAX_LENGTH), {
    stage: 'invitation',
    event,
  });
  assert.equal(at.ok, true);
  assert.equal(at.length, 400);
  const over = validatePersonalText(textOfLength(401), {
    stage: 'invitation',
    event,
  });
  assert.deepEqual(over, {
    ok: false,
    errors: [{ code: 'too_long', length: 401, limit: 400 }],
    length: 401,
  });
});

test('each validation error', () => {
  const event = weddingEvent({ ceremonyTime: null });
  const check = (
    text: PersonalText,
    stage: Parameters<
      typeof validatePersonalText
    >[1]['stage'] = 'event_reminder',
  ) => {
    const result = validatePersonalText(text, { stage, event });
    return result.ok ? [] : result.errors;
  };
  assert.deepEqual(
    check({ paragraphs: [[t('1')], [t('2')], [t('3')], [t('4')]] }),
    [{ code: 'too_many_paragraphs', count: 4, limit: 3 }],
  );
  assert.deepEqual(check({ paragraphs: [[t('חופה ב'), f('ceremonyTime')]] }), [
    { code: 'empty_field', field: 'ceremonyTime' },
  ]);
  assert.deepEqual(
    check(
      { paragraphs: [[tableSentence(t('שולחן '), f('tableNumber'))]] },
      'thank_you',
    ),
    [
      { code: 'table_sentence_outside_reminder' },
      { code: 'field_not_offered', field: 'tableNumber' },
    ],
  );
  assert.deepEqual(
    check({
      paragraphs: [
        [tableSentence(f('tableNumber'))],
        [tableSentence(f('tableNumber'))],
      ],
    }),
    [{ code: 'more_than_one_table_sentence' }],
  );
  assert.deepEqual(check({ paragraphs: [[t('שולחן '), f('tableNumber')]] }), [
    { code: 'table_field_outside_sentence' },
  ]);
  // A per-Guest field is never empty at save time.
  assert.deepEqual(check({ paragraphs: [[f('guestName')]] }), []);
});

test('a blank text is valid and means the Kululu Wording', () => {
  const result = validatePersonalText(
    { paragraphs: [[t('   ')]] },
    { stage: 'invitation', event: weddingEvent() },
  );
  assert.deepEqual(result, {
    ok: true,
    text: { paragraphs: [] },
    length: 0,
    blank: true,
  });
});
