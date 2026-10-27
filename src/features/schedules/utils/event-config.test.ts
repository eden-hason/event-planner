import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasPersonalMessage, includesGiftButton } from './event-config';

const bit = { bitConfig: { enabled: true, link: 'https://www.bitpay.co.il/app/me/abc' } };

describe('includesGiftButton', () => {
  it('never adds the button when no gifting provider is set up', () => {
    assert.equal(includesGiftButton(null, 'event_reminder'), false);
    assert.equal(
      includesGiftButton({ giftButtons: { event_reminder: true } }, 'event_reminder'),
      false,
    );
    assert.equal(
      includesGiftButton(
        { bitConfig: { enabled: true, link: '  ' }, giftButtons: { post_event: true } },
        'post_event',
      ),
      false,
    );
  });

  it('defaults the reminder on and the thank-you off', () => {
    assert.equal(includesGiftButton(bit, 'event_reminder'), true);
    assert.equal(includesGiftButton(bit, 'post_event'), false);
  });

  it("follows the Organiser's choice over the default", () => {
    const flipped = { ...bit, giftButtons: { event_reminder: false, post_event: true } };
    assert.equal(includesGiftButton(flipped, 'event_reminder'), false);
    assert.equal(includesGiftButton(flipped, 'post_event'), true);
  });

  it('leaves types without a gift variant off', () => {
    assert.equal(includesGiftButton(bit, 'confirmation'), false);
  });
});

describe('hasPersonalMessage', () => {
  it('counts only text that trims to something', () => {
    assert.equal(hasPersonalMessage('נשמח לראותכם'), true);
    assert.equal(hasPersonalMessage('  \n\t '), false);
    assert.equal(hasPersonalMessage(''), false);
    assert.equal(hasPersonalMessage(null), false);
    assert.equal(hasPersonalMessage(undefined), false);
  });
});
