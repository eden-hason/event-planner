import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  KULULU_TRANSPORTATION_CHECKBOX_WORDING,
  KULULU_TRANSPORTATION_WORDING,
  ownerTransportationWording,
  storedTransportationGroupUrl,
  transportationGroupFor,
  transportationWording,
  validateTransportationGroupUrl,
} from './transportation-question';

const GROUP = 'https://chat.whatsapp.com/AbC123xyz';

describe('ownerTransportationWording', () => {
  it('keeps what the Owner wrote, trimmed', () => {
    assert.equal(ownerTransportationWording('  הסעה מתל אביב?\n'), 'הסעה מתל אביב?');
  });

  it('keeps line breaks inside the wording', () => {
    assert.equal(ownerTransportationWording('הסעה?\nיוצאת ב-17:00'), 'הסעה?\nיוצאת ב-17:00');
  });

  it('stores nothing for blank, whitespace, or Kululu\'s own text', () => {
    assert.equal(ownerTransportationWording(''), null);
    assert.equal(ownerTransportationWording('   \n '), null);
    assert.equal(ownerTransportationWording(null), null);
    assert.equal(ownerTransportationWording(undefined), null);
    assert.equal(ownerTransportationWording(` ${KULULU_TRANSPORTATION_WORDING} `), null);
  });
});

describe('transportationWording', () => {
  it('asks Kululu\'s wording for each place when the Owner wrote none', () => {
    assert.equal(transportationWording(null, 'chat'), KULULU_TRANSPORTATION_WORDING);
    assert.equal(transportationWording(null, 'checkbox'), KULULU_TRANSPORTATION_CHECKBOX_WORDING);
    assert.equal(transportationWording('  ', 'checkbox'), KULULU_TRANSPORTATION_CHECKBOX_WORDING);
  });

  it('shows the Owner\'s wording as written in both places', () => {
    const owned = 'הסעה מרכבת השלום ב-17:00 - שומרים לכם מקום?';
    assert.equal(transportationWording(owned, 'chat'), owned);
    assert.equal(transportationWording(owned, 'checkbox'), owned);
  });
});

describe('validateTransportationGroupUrl', () => {
  it('accepts a WhatsApp group invite, blank included', () => {
    assert.equal(validateTransportationGroupUrl(GROUP), null);
    assert.equal(validateTransportationGroupUrl(` ${GROUP}/ `), null);
    assert.equal(validateTransportationGroupUrl('https://chat.whatsapp.com/AbC123xyz?mode=ac_t'), null);
    assert.equal(validateTransportationGroupUrl(''), null);
    assert.equal(validateTransportationGroupUrl(null), null);
  });

  it('refuses what is not a link', () => {
    assert.equal(validateTransportationGroupUrl('קבוצת ההסעה'), 'notUrl');
    assert.equal(validateTransportationGroupUrl('chat.whatsapp.com/AbC123xyz'), 'notUrl');
    assert.equal(validateTransportationGroupUrl('http://chat.whatsapp.com/AbC123xyz'), 'notUrl');
  });

  it('refuses the near misses: a chat, a channel, the bare host', () => {
    assert.equal(validateTransportationGroupUrl('https://wa.me/972501234567'), 'notWhatsAppGroup');
    assert.equal(validateTransportationGroupUrl('https://whatsapp.com/channel/0029Va'), 'notWhatsAppGroup');
    assert.equal(validateTransportationGroupUrl('https://chat.whatsapp.com/'), 'notWhatsAppGroup');
    assert.equal(validateTransportationGroupUrl('https://chat.whatsapp.com/a/b'), 'notWhatsAppGroup');
    assert.equal(validateTransportationGroupUrl('https://example.com/AbC123xyz'), 'notWhatsAppGroup');
  });
});

describe('storedTransportationGroupUrl', () => {
  it('stores a valid link trimmed, and nothing for blank or invalid', () => {
    assert.equal(storedTransportationGroupUrl(`  ${GROUP} `), GROUP);
    assert.equal(storedTransportationGroupUrl(''), null);
    assert.equal(storedTransportationGroupUrl('https://wa.me/972501234567'), null);
  });
});

describe('transportationGroupFor', () => {
  const base = {
    askTransportation: true,
    groupUrl: GROUP,
    rsvpStatus: 'confirmed',
    needsTransportation: true,
  } as const;

  it('points a confirmed "yes" to the group', () => {
    assert.equal(transportationGroupFor(base), GROUP);
  });

  it('shows nothing to a "no" or an unanswered record', () => {
    assert.equal(transportationGroupFor({ ...base, needsTransportation: false }), null);
    assert.equal(transportationGroupFor({ ...base, needsTransportation: null }), null);
  });

  it('shows nothing to a record that is not confirmed', () => {
    assert.equal(transportationGroupFor({ ...base, rsvpStatus: 'declined' }), null);
    assert.equal(transportationGroupFor({ ...base, rsvpStatus: 'pending' }), null);
  });

  it('shows nothing while the question is off, or with no group', () => {
    assert.equal(transportationGroupFor({ ...base, askTransportation: false }), null);
    assert.equal(transportationGroupFor({ ...base, groupUrl: null }), null);
    assert.equal(transportationGroupFor({ ...base, groupUrl: '' }), null);
  });

  it('never hands out a stored link that is not a group invite', () => {
    assert.equal(transportationGroupFor({ ...base, groupUrl: 'https://example.com/x' }), null);
  });
});
