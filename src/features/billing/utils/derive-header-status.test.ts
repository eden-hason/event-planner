import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { deriveHeaderStatus } from './derive-header-status';

describe('deriveHeaderStatus', () => {
  it('offers the upgrade while nothing is paid or on its way', () => {
    assert.equal(deriveHeaderStatus('free').canUpgrade, true);
    assert.equal(deriveHeaderStatus('canceled').canUpgrade, true);
  });

  it('shows the pill instead once a payment is pending or made', () => {
    assert.equal(deriveHeaderStatus('payment_pending').canUpgrade, false);
    assert.equal(deriveHeaderStatus('paid').canUpgrade, false);
  });
});
