import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { pickPersonalMessageTemplates, pickTemplates, resolveTemplatesForSchedule } from './resolve-reminder-templates.ts';
import {
  MessageTemplateDbToAppSchema,
  type MessageTemplateApp,
} from '../schemas/message-templates';

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
    personalMessage: false,
    bareFrame: false,
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

// --- The Personal Message family (ADR 0046) ---------------------------------
// resolveTemplatesForSchedule reads the catalog, so these run it against an
// in-memory stand-in for the one query shape it makes: select('*') then eq().

const TYPE_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_TYPE_ID = '22222222-2222-4222-8222-222222222222';

let nextId = 0;
function dbRow(
  name: string,
  fields: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  nextId += 1;
  return {
    id: `00000000-0000-4000-8000-${String(nextId).padStart(12, '0')}`,
    key: 'event_reminder_1',
    channel: 'sms',
    schedule_type_id: TYPE_ID,
    variant: '1',
    name,
    description: null,
    language_code: 'he',
    whatsapp_template_name: null,
    requires_table_numbers: false,
    requires_gifting: false,
    requires_note: false,
    requires_follow_up: false,
    requires_invitation_image: false,
    personal_message: false,
    bare_frame: false,
    payload: {
      bodyText: name,
      parameters: { headerPlaceholders: [], placeholders: [], buttonPlaceholders: [] },
    },
    ...fields,
  };
}

const personal = { key: 'personal_message_event_reminder', personal_message: true };
const catalog = [
  dbRow('variant'),
  dbRow('variant+note', { requires_note: true }),
  dbRow('variant+table', { requires_table_numbers: true }),
  dbRow('variant+table+note', { requires_table_numbers: true, requires_note: true }),
  dbRow('personal', personal),
  dbRow('personal+table', { ...personal, requires_table_numbers: true }),
  // Another Schedule Type's frame, which must never be picked up.
  dbRow('other-personal', { ...personal, key: 'personal_message_post_event', schedule_type_id: OTHER_TYPE_ID }),
];

function fakeSupabase(rows: Record<string, unknown>[]): SupabaseClient {
  return {
    from: () => {
      const filters: [string, unknown][] = [];
      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          filters.push([column, value]);
          return builder;
        },
        then: (resolve: (result: { data: unknown[]; error: null }) => unknown) =>
          resolve({
            data: rows.filter((row) => filters.every(([column, value]) => row[column] === value)),
            error: null,
          }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

const anchor = MessageTemplateDbToAppSchema.parse(catalog[0]);

async function sentNames(
  personalMessage: string | null,
  axes: { tableNumbers?: boolean; note?: boolean; bareFrame?: boolean } = {},
  rows = catalog,
) {
  const result = await resolveTemplatesForSchedule({
    supabase: fakeSupabase(rows),
    anchor,
    personalMessage,
    gifting: false,
    tableNumbers: axes.tableNumbers ?? false,
    note: axes.note ?? false,
    bareFrame: axes.bareFrame ?? false,
  });
  assert.ok(result.success, result.success ? '' : result.message);
  return {
    withTable: result.templates.withTable?.name ?? null,
    withoutTable: result.templates.withoutTable.name,
  };
}

test('a Personal Message sends its Schedule Type frame instead of the Variant', async () => {
  assert.deepEqual(await sentNames('מתרגשים לראות אתכם'), {
    withTable: null,
    withoutTable: 'personal',
  });
});

test('a blank Personal Message is none, and the Variant goes', async () => {
  assert.deepEqual(await sentNames(null), { withTable: null, withoutTable: 'variant' });
  assert.deepEqual(await sentNames('  \n '), { withTable: null, withoutTable: 'variant' });
});

test('the table axis still applies inside the Personal Message family', async () => {
  assert.deepEqual(await sentNames('מתרגשים', { tableNumbers: true }), {
    withTable: 'personal+table',
    withoutTable: 'personal',
  });
});

test('a legacy note is ignored once the Schedule carries a Personal Message', async () => {
  assert.deepEqual(await sentNames('מתרגשים', { note: true }), {
    withTable: null,
    withoutTable: 'personal',
  });
  assert.deepEqual(await sentNames(null, { note: true }), {
    withTable: null,
    withoutTable: 'variant+note',
  });
});

test('a Personal Message with no family for its Schedule Type fails rather than sending the Variant', async () => {
  const result = await resolveTemplatesForSchedule({
    supabase: fakeSupabase(catalog.filter((row) => !row.personal_message)),
    anchor,
    personalMessage: 'מתרגשים',
    gifting: false,
    tableNumbers: false,
  });
  assert.equal(result.success, false);
});

test('the SMS Fallback resolves the same family on the SMS channel, Personal Message or not', async () => {
  // A WhatsApp anchor: every row in this catalog is on SMS, so only a resolve on
  // the 'sms' channel can find anything.
  const whatsappAnchor = { ...anchor, channel: 'whatsapp' } as MessageTemplateApp;
  const resolveSms = (personalMessage: string | null) =>
    resolveTemplatesForSchedule({
      supabase: fakeSupabase(catalog),
      anchor: whatsappAnchor,
      channel: 'sms',
      personalMessage,
      gifting: false,
      tableNumbers: false,
    });

  const variant = await resolveSms(null);
  assert.ok(variant.success);
  assert.equal(variant.templates.withoutTable.name, 'variant');

  const personalMessage = await resolveSms('מתרגשים');
  assert.ok(personalMessage.success);
  assert.equal(personalMessage.templates.withoutTable.name, 'personal');
});

test('picking from an empty Personal Message family gives nothing to preview', () => {
  assert.equal(
    pickPersonalMessageTemplates({ candidates: [], gifting: false, tableNumbers: false }),
    null,
  );
});

// A Confirmation-shaped catalog: its Personal Message family offers the Bare
// Frame, with no table axis.
const CONFIRMATION_TYPE_ID = '33333333-3333-4333-8333-333333333333';
const confirmationPersonal = {
  key: 'personal_message_confirmation',
  schedule_type_id: CONFIRMATION_TYPE_ID,
  personal_message: true,
};
const confirmationCatalog = [
  dbRow('confirmation', { key: 'confirmation_1', schedule_type_id: CONFIRMATION_TYPE_ID }),
  dbRow('confirmation-personal', confirmationPersonal),
  dbRow('confirmation-personal-bare', { ...confirmationPersonal, bare_frame: true }),
];
const confirmationAnchor = MessageTemplateDbToAppSchema.parse(confirmationCatalog[0]);

async function sentConfirmation(personalMessage: string | null, bareFrame: boolean) {
  const result = await resolveTemplatesForSchedule({
    supabase: fakeSupabase(confirmationCatalog),
    anchor: confirmationAnchor,
    personalMessage,
    bareFrame,
    gifting: false,
    tableNumbers: true,
  });
  assert.ok(result.success, result.success ? '' : result.message);
  return result.templates.withoutTable.name;
}

test('a Personal Message in its Bare Frame sends the frame with no Event details', async () => {
  assert.equal(await sentConfirmation('מתרגשים', true), 'confirmation-personal-bare');
  assert.equal(await sentConfirmation('מתרגשים', false), 'confirmation-personal');
});

test('the Bare Frame means nothing without a Personal Message', async () => {
  assert.equal(await sentConfirmation(null, true), 'confirmation');
});

test('a family that offers no Bare Frame sends its full frame', async () => {
  assert.deepEqual(await sentNames('מתרגשים', { bareFrame: true }), {
    withTable: null,
    withoutTable: 'personal',
  });
});

test('the SMS Fallback of a Bare Frame sends the ordinary SMS frame, which has no Bare Frame', async () => {
  const smsFrame = dbRow('confirmation-personal-sms', confirmationPersonal);
  const whatsappRows = confirmationCatalog.map((row) => ({ ...row, channel: 'whatsapp' }));
  const result = await resolveTemplatesForSchedule({
    supabase: fakeSupabase([...whatsappRows, smsFrame]),
    anchor: { ...confirmationAnchor, channel: 'whatsapp' } as MessageTemplateApp,
    channel: 'sms',
    personalMessage: 'מתרגשים',
    bareFrame: true,
    gifting: false,
    tableNumbers: false,
  });
  assert.ok(result.success, result.success ? '' : result.message);
  assert.equal(result.templates.withoutTable.name, 'confirmation-personal-sms');
});
