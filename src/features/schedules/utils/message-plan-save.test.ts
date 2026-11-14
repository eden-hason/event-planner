import { test } from 'node:test';
import assert from 'node:assert/strict';

import { serialisePersonalText, type PersonalText } from '../message-plan';
import { weddingEvent } from '../message-plan/test-fixtures';
import { checkMessagePlanSave } from './message-plan-save';

const text = (...paragraphs: PersonalText['paragraphs']) => serialisePersonalText({ paragraphs });
const t = (value: string) => ({ kind: 'text' as const, text: value });

const check = (
  scheduleTypeKey: string,
  input: unknown,
  overrides: Partial<Parameters<typeof checkMessagePlanSave>[0]> = {},
) =>
  checkMessagePlanSave({
    scheduleTypeKey,
    input,
    stored: { wording: 'kululu', personalText: null },
    event: weddingEvent(),
    ...overrides,
  });

test('a Personal Message is cleaned and stored with its wording', () => {
  const result = check('invitation', {
    wording: 'personal',
    personalText: text([t('  מחכים  לכם\t')], [], [t('נתראה')]),
  });
  assert.deepEqual(result, {
    ok: true,
    update: {
      wording: 'personal',
      personal_text: text([t('מחכים לכם')], [t('נתראה')]),
    },
  });
});

test('a blank Personal Message saves as Kululu text', () => {
  assert.deepEqual(check('invitation', { wording: 'personal', personalText: text([t('  ')]) }), {
    ok: true,
    update: { wording: 'kululu', personal_text: null },
  });
});

test('switching to Kululu text keeps the draft, unchecked', () => {
  const draft = text([{ kind: 'field', field: 'ceremonyTime' }]);
  const result = check('invitation', { wording: 'kululu' }, {
    stored: { wording: 'personal', personalText: draft },
    event: weddingEvent({ ceremonyTime: null }),
  });
  assert.deepEqual(result, { ok: true, update: { wording: 'kululu', personal_text: draft } });
});

test('a Personal Message with an empty field cannot be saved', () => {
  const result = check(
    'invitation',
    { wording: 'personal', personalText: text([t('החופה ב'), { kind: 'field', field: 'ceremonyTime' }]) },
    { event: weddingEvent({ ceremonyTime: null }) },
  );
  assert.deepEqual(result, {
    ok: false,
    error: { code: 'personal_text', errors: [{ code: 'empty_field', field: 'ceremonyTime' }] },
  });
});

test('changing only the text is checked against the stored wording', () => {
  const tooMany = text([t('א')], [t('ב')], [t('ג')], [t('ד')]);
  const result = check('post_event', { personalText: tooMany }, {
    stored: { wording: 'personal', personalText: null },
  });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.error.code, 'personal_text');
});

test('fields do not count toward the 400, over 400 typed is refused', () => {
  const full = 'א'.repeat(400);
  const ok = check('invitation', {
    wording: 'personal',
    personalText: text([t(full), { kind: 'field', field: 'guestName' }, { kind: 'field', field: 'venueName' }]),
  });
  assert.equal(ok.ok, true);
  const over = check('invitation', { wording: 'personal', personalText: text([t(full + 'ב')]) });
  assert.equal(over.ok, false);
});

test('the table sentence is refused outside the Reminder', () => {
  const sentence = text([
    t('נתראה'),
    { kind: 'table_sentence', segments: [t('השולחן שלכם: '), { kind: 'field', field: 'tableNumber' }] },
  ]);
  assert.equal(check('event_reminder', { wording: 'personal', personalText: sentence }).ok, true);
  assert.equal(check('post_event', { wording: 'personal', personalText: sentence }).ok, false);
});

test('an Ask may attach only what its stage offers and the Event has', () => {
  assert.deepEqual(check('invitation', { attachment: 'video' }), {
    ok: true,
    update: { attachment: 'video' },
  });
  assert.deepEqual(check('follow_up', { attachment: 'video' }), {
    ok: false,
    error: { code: 'attachment_not_offered' },
  });
  assert.deepEqual(
    check('invitation', { attachment: 'image' }, { event: weddingEvent({ invitations: null }) }),
    { ok: false, error: { code: 'attachment_unavailable' } },
  );
  assert.deepEqual(check('event_reminder', { attachment: 'none' }), {
    ok: false,
    error: { code: 'attachment_not_offered' },
  });
});

test('the gift switch turns on only with a Gifting page, and off always', () => {
  assert.deepEqual(check('post_event', { giftButton: true }), {
    ok: true,
    update: { gift_button: true },
  });
  const noGifting = weddingEvent({ eventSettings: undefined });
  assert.deepEqual(check('post_event', { giftButton: true }, { event: noGifting }), {
    ok: false,
    error: { code: 'gift_unavailable' },
  });
  assert.deepEqual(check('post_event', { giftButton: false }, { event: noGifting }), {
    ok: true,
    update: { gift_button: false },
  });
  assert.deepEqual(check('invitation', { giftButton: true }), {
    ok: false,
    error: { code: 'gift_not_offered' },
  });
});

test('a save touches only what it was given', () => {
  assert.deepEqual(check('invitation', { scheduledDate: '2026-11-01T08:00:00.000Z' }), {
    ok: true,
    update: {},
  });
});

test('anything else is refused', () => {
  assert.deepEqual(check('invitation', { wording: 'loud' }), {
    ok: false,
    error: { code: 'invalid_input' },
  });
  assert.deepEqual(check('invitation', { extra: 1 }), { ok: false, error: { code: 'invalid_input' } });
  assert.deepEqual(check('confirmation', {}), { ok: false, error: { code: 'not_a_stage' } });
});
