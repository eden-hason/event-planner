import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { carriesReadReceipt, handDeliveryRefusal, whatsappChatUrl } from './hand-delivery';

describe('whatsappChatUrl', () => {
  const text = 'נשמח לראותכם 🎉\n\n📅 יום רביעי\n📍 אמרלד, בית שמש\nלאישור הגעה: https://kululu.app/c/abc?x=1&y=2';

  it('opens a chat with the number as digits and the text encoded', () => {
    assert.equal(
      whatsappChatUrl('+972501234567', 'שלום\nלאישור הגעה: https://kululu.app/c/abc'),
      `https://api.whatsapp.com/send?phone=972501234567&text=${encodeURIComponent('שלום\nלאישור הגעה: https://kululu.app/c/abc')}`,
    );
  });

  it('does not go through the wa.me redirect, which mangles emojis', () => {
    assert.doesNotMatch(whatsappChatUrl('+972501234567', text), /wa\.me/);
  });

  it('keeps emojis, line breaks and the link intact', () => {
    const url = new URL(whatsappChatUrl('+972501234567', text));
    assert.equal(url.searchParams.get('text'), text);
    assert.match(url.search, /%F0%9F%8E%89/);
  });

  it('encodes spaces as %20, not +', () => {
    assert.doesNotMatch(whatsappChatUrl('+972501234567', 'a b'), /\+/);
  });

  it('opens an empty chat when there is no text', () => {
    assert.equal(whatsappChatUrl('+972501234567', null), 'https://api.whatsapp.com/send?phone=972501234567');
  });

  it('keeps a number from abroad', () => {
    assert.equal(new URL(whatsappChatUrl('+12125550100', 'hi')).searchParams.get('phone'), '12125550100');
  });
});

describe('handDeliveryRefusal', () => {
  const failed = { triggered_by: 'scheduled' };

  it('offers any Failed Delivery, SMS tried or not', () => {
    assert.equal(handDeliveryRefusal({ status: 'failed', attempts: [failed] }), null);
    assert.equal(
      handDeliveryRefusal({ status: 'failed', attempts: [failed, { triggered_by: 'fallback_auto' }] }),
      null,
    );
  });

  it('refuses a Delivery that is not Failed', () => {
    for (const status of ['sent', 'delivered', 'read', 'not_sent', 'pending']) {
      assert.equal(handDeliveryRefusal({ status, attempts: [failed] }), 'not_failed');
    }
  });

  it('refuses a second Hand Delivery', () => {
    assert.equal(
      handDeliveryRefusal({ status: 'delivered', attempts: [failed, { triggered_by: 'hand' }] }),
      'already_by_hand',
    );
  });
});

describe('carriesReadReceipt', () => {
  const failedWa = { byHand: false };
  const hand = { byHand: true, deliveredAt: '2026-11-02T09:00:00Z' };

  it('is Kululu\'s own WhatsApp, reached or on its way', () => {
    assert.equal(carriesReadReceipt({ delivery: 'whatsapp', steps: [{ deliveredAt: 'x' }] }), true);
    assert.equal(carriesReadReceipt({ delivery: 'on_its_way', steps: [] }), true);
  });

  it('is never an SMS, a failure or a Guest nothing was sent to', () => {
    for (const delivery of ['sms', 'sms_on_its_way', 'not_delivered', 'no_phone', null]) {
      assert.equal(carriesReadReceipt({ delivery, steps: [] }), false);
    }
  });

  it('is not a Guest reached by hand', () => {
    assert.equal(carriesReadReceipt({ delivery: 'whatsapp', steps: [failedWa, hand] }), false);
  });

  it('counts again once a provider also reached them', () => {
    assert.equal(
      carriesReadReceipt({ delivery: 'whatsapp', steps: [hand, { readAt: '2026-11-02T10:00:00Z' }] }),
      true,
    );
  });
});
