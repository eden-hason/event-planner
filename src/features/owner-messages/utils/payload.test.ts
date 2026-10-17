import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildOwnerMessagePayload, firstName } from './payload';
import type { OwnerMessageFacts } from '../types';

const facts: OwnerMessageFacts = {
  eventId: '11111111-1111-1111-1111-111111111111',
  eventTypeKey: 'wedding',
  eventDate: '2026-11-12T00:00:00+00:00',
  ownerUserId: '22222222-2222-2222-2222-222222222222',
  ownerFullName: 'נועה  כהן',
  ownerPhone: '+972545451963',
  channel: 'whatsapp_calls',
  packageSize: 1020,
};

describe('buildOwnerMessagePayload - welcome', () => {
  it('fills name, occasion, date, Plan and package, and links Home', () => {
    const result = buildOwnerMessagePayload('welcome', facts);
    assert.ok(result.ok);
    const { payload } = result;
    assert.equal(payload.templateName, 'owner_welcome_1');
    assert.equal(payload.languageCode, 'he');
    assert.equal(payload.to, '+972545451963');
    assert.deepEqual(payload.components[0], {
      type: 'body',
      parameters: [
        { type: 'text', text: 'נועה' },
        { type: 'text', text: 'חתונה' },
        { type: 'text', text: '12.11.2026' },
        { type: 'text', text: 'WhatsApp + שיחות' },
        { type: 'text', text: (1020).toLocaleString('he-IL') },
      ],
    });
    assert.deepEqual(payload.components[1], {
      type: 'button',
      sub_type: 'url',
      index: 0,
      parameters: [{ type: 'text', text: `app/${facts.eventId}/home` }],
    });
  });

  it('names a mitzva by its noun and falls back for an unknown type', () => {
    const bar = buildOwnerMessagePayload('welcome', { ...facts, eventTypeKey: 'bar_mitzva' });
    const other = buildOwnerMessagePayload('welcome', { ...facts, eventTypeKey: null });
    assert.ok(bar.ok && other.ok);
    const occasionOf = (p: typeof bar) =>
      p.ok && p.payload.components[0].type === 'body'
        ? (p.payload.components[0].parameters[1] as { text: string }).text
        : null;
    assert.equal(occasionOf(bar), 'בר המצווה');
    assert.equal(occasionOf(other), 'אירוע');
  });

  it('refuses without a payment or a date', () => {
    assert.equal(buildOwnerMessagePayload('welcome', { ...facts, channel: null }).ok, false);
    assert.equal(buildOwnerMessagePayload('welcome', { ...facts, eventDate: null }).ok, false);
  });
});

describe('buildOwnerMessagePayload - post event', () => {
  it('fills the name and links the gifting page', () => {
    const result = buildOwnerMessagePayload('post_event', { ...facts, channel: null });
    assert.ok(result.ok);
    assert.equal(result.payload.templateName, 'owner_post_event_1');
    assert.deepEqual(result.payload.components, [
      { type: 'body', parameters: [{ type: 'text', text: 'נועה' }] },
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [{ type: 'text', text: `app/${facts.eventId}/gifting` }],
      },
    ]);
  });
});

describe('buildOwnerMessagePayload - recipient', () => {
  it('refuses without a usable phone or a name', () => {
    assert.equal(buildOwnerMessagePayload('post_event', { ...facts, ownerPhone: null }).ok, false);
    assert.equal(buildOwnerMessagePayload('post_event', { ...facts, ownerPhone: '123' }).ok, false);
    assert.equal(buildOwnerMessagePayload('post_event', { ...facts, ownerFullName: '  ' }).ok, false);
  });

  it('takes the first word of the full name', () => {
    assert.equal(firstName(' דורון לוי '), 'דורון');
    assert.equal(firstName(null), null);
  });
});
