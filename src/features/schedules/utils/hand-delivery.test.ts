import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { handDeliveryRefusal, reachedByHand, whatsappChatUrl } from './hand-delivery';

describe('whatsappChatUrl', () => {
  it('opens a chat with the number as digits and the text encoded', () => {
    assert.equal(
      whatsappChatUrl('+972501234567', 'שלום\nלאישור הגעה: https://kululu.app/c/abc'),
      `https://wa.me/972501234567?text=${encodeURIComponent('שלום\nלאישור הגעה: https://kululu.app/c/abc')}`,
    );
  });

  it('keeps a number from abroad', () => {
    assert.match(whatsappChatUrl('+12125550100', 'hi'), /^https:\/\/wa\.me\/12125550100\?/);
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

describe('reachedByHand', () => {
  it('is the hand attempt when nothing else reached the Guest', () => {
    assert.equal(
      reachedByHand([
        { triggered_by: 'scheduled', status: 'failed' },
        { triggered_by: 'fallback_auto', status: 'failed' },
        { triggered_by: 'hand', status: 'delivered' },
      ]),
      true,
    );
  });

  it('gives way to a provider report that reached them', () => {
    assert.equal(
      reachedByHand([
        { triggered_by: 'fallback_auto', status: 'delivered' },
        { triggered_by: 'hand', status: 'delivered' },
      ]),
      false,
    );
  });

  it('is false with no Hand Delivery', () => {
    assert.equal(reachedByHand([{ triggered_by: 'scheduled', status: 'delivered' }]), false);
  });
});
