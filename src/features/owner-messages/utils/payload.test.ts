import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildOwnerMessagePayload, firstName } from './payload';
import type { OwnerMessageFacts } from '../types';

const facts: OwnerMessageFacts = {
  ownerUserId: '22222222-2222-2222-2222-222222222222',
  ownerFullName: 'נועה  כהן',
  ownerPhone: '+972545451963',
  channel: 'whatsapp_calls',
  packageSize: 1020,
};

describe('buildOwnerMessagePayload - welcome', () => {
  it('fills name, Plan and package, with no button parameters', () => {
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
        { type: 'text', text: 'WhatsApp + שיחות' },
        { type: 'text', text: (1020).toLocaleString('he-IL') },
      ],
    });
    // The app quick reply and the support button are both static in Meta.
    assert.equal(payload.components.length, 1);
  });

  it('refuses without a payment', () => {
    assert.equal(buildOwnerMessagePayload('welcome', { ...facts, channel: null }).ok, false);
    assert.equal(buildOwnerMessagePayload('welcome', { ...facts, packageSize: null }).ok, false);
  });
});

describe('buildOwnerMessagePayload - post event', () => {
  it('fills the name, with no buttons', () => {
    const result = buildOwnerMessagePayload('post_event', { ...facts, channel: null });
    assert.ok(result.ok);
    assert.equal(result.payload.templateName, 'owner_post_event_1');
    assert.deepEqual(result.payload.components, [
      { type: 'body', parameters: [{ type: 'text', text: 'נועה' }] },
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
