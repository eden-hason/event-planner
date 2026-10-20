import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { pickTemplates } from './resolve-reminder-templates.ts';
import type { MessageTemplateApp } from '../schemas/message-templates';

function row(id: string, flags: Partial<MessageTemplateApp> = {}): MessageTemplateApp {
  return {
    id,
    key: 'event_reminder',
    scheduleTypeId: 'type',
    variant: 'casual',
    name: id,
    description: null,
    languageCode: 'he',
    requiresTableNumbers: false,
    requiresGifting: false,
    requiresNote: false,
    requiresFollowUp: false,
    requiresInvitationImage: false,
    ...flags,
    channel: 'sms',
    payload: { bodyText: id, parameters: { headerPlaceholders: [], placeholders: [], buttonPlaceholders: [] } },
  };
}

// The reminder's note x table-numbers grid, as one SMS family.
const reminder = [
  row('plain'),
  row('note', { requiresNote: true }),
  row('table', { requiresTableNumbers: true }),
  row('table+note', { requiresTableNumbers: true, requiresNote: true }),
];

const pickIds = (
  candidates: MessageTemplateApp[],
  axes: { tableNumbers: boolean; note?: boolean },
) => {
  const result = pickTemplates({ anchor: candidates[0], candidates, gifting: false, ...axes });
  assert.ok(result.success);
  return {
    withTable: result.templates.withTable?.id ?? null,
    withoutTable: result.templates.withoutTable.id,
    offersNote: result.templates.offersNote,
  };
};

test('the note picks the note rows, on both sides of the table axis', () => {
  assert.deepEqual(pickIds(reminder, { tableNumbers: true, note: true }), {
    withTable: 'table+note',
    withoutTable: 'note',
    offersNote: true,
  });
  assert.deepEqual(pickIds(reminder, { tableNumbers: true, note: false }), {
    withTable: 'table',
    withoutTable: 'plain',
    offersNote: true,
  });
});

test('no table numbers leaves the table rows out', () => {
  assert.deepEqual(pickIds(reminder, { tableNumbers: false, note: true }), {
    withTable: null,
    withoutTable: 'note',
    offersNote: true,
  });
});

test('a family with no note variant resolves the same with or without one', () => {
  const invitation = [row('invitation')];
  assert.deepEqual(
    pickIds(invitation, { tableNumbers: true, note: true }),
    pickIds(invitation, { tableNumbers: true, note: false }),
  );
  assert.equal(pickIds(invitation, { tableNumbers: false, note: true }).offersNote, false);
});

test('a family missing a row on an axis it offers fails rather than sending a near-miss', () => {
  const result = pickTemplates({
    anchor: reminder[0],
    candidates: [row('plain'), row('table', { requiresTableNumbers: true }), row('stray', { requiresNote: true, requiresGifting: true })],
    gifting: false,
    tableNumbers: false,
    note: true,
  });
  assert.equal(result.success, false);
});

test('an empty family fails', () => {
  const result = pickTemplates({ anchor: reminder[0], candidates: [], gifting: false, tableNumbers: false });
  assert.equal(result.success, false);
});
