import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clampTopUp, suggestedTopUp, topUpPlan, topUpTotal } from './top-up';

describe('clampTopUp', () => {
  it('snaps to multiples of 10', () => {
    assert.equal(clampTopUp(34), 30);
    assert.equal(clampTopUp(35), 40);
  });

  it('never goes below 10', () => {
    assert.equal(clampTopUp(0), 10);
    assert.equal(clampTopUp(-50), 10);
    assert.equal(clampTopUp(Number.NaN), 10);
  });

  it('has no ceiling', () => {
    assert.equal(clampTopUp(25_000), 25_000);
  });
});

describe('suggestedTopUp', () => {
  it('covers what is over the package, rounded up to the step', () => {
    assert.equal(suggestedTopUp(1), 10);
    assert.equal(suggestedTopUp(23), 30);
    assert.equal(suggestedTopUp(40), 40);
  });

  it('offers 50 while the package still has room', () => {
    assert.equal(suggestedTopUp(0), 50);
  });
});

describe('topUpTotal', () => {
  it('charges the Plan rate per record', () => {
    assert.equal(topUpTotal(30, 'whatsapp'), 45);
    assert.equal(topUpTotal(30, 'whatsapp_calls'), 60);
  });
});

describe('topUpPlan', () => {
  const now = new Date('2026-10-19T10:00:00Z');
  const paid = {
    billingStatus: 'paid' as const,
    channel: 'whatsapp' as const,
    gifted: false,
    eventDate: '2026-11-01T00:00:00Z',
    now,
  };

  it('is the package Plan for a paid package before the Event', () => {
    assert.equal(topUpPlan(paid), 'whatsapp');
    assert.equal(topUpPlan({ ...paid, channel: 'whatsapp_calls' }), 'whatsapp_calls');
  });

  it('is still offered on the Event day', () => {
    assert.equal(topUpPlan({ ...paid, eventDate: '2026-10-19T00:00:00Z' }), 'whatsapp');
  });

  it('is not offered once the Event day is over', () => {
    assert.equal(topUpPlan({ ...paid, eventDate: '2026-10-18T00:00:00Z' }), null);
  });

  it('is not offered on anything but a paid Event', () => {
    for (const billingStatus of ['free', 'payment_pending', 'canceled', null] as const) {
      assert.equal(topUpPlan({ ...paid, billingStatus }), null);
    }
  });

  it('is not offered on a package Kululu gave', () => {
    assert.equal(topUpPlan({ ...paid, gifted: true }), null);
  });

  it('is not offered on a Plan no longer on sale, or none', () => {
    assert.equal(topUpPlan({ ...paid, channel: 'sms' }), null);
    assert.equal(topUpPlan({ ...paid, channel: null }), null);
  });
});
