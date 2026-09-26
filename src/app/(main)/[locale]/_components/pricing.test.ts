import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bonusRecords, clampRecords, quote } from './pricing';

describe('bonusRecords', () => {
  it('gives 10 up to and including 200 records', () => {
    assert.equal(bonusRecords(50), 10);
    assert.equal(bonusRecords(200), 10);
  });

  it('gives 20 above 200 records', () => {
    assert.equal(bonusRecords(250), 20);
    assert.equal(bonusRecords(1000), 20);
  });
});

describe('clampRecords', () => {
  it('keeps values inside the slider range', () => {
    assert.equal(clampRecords(0), 50);
    assert.equal(clampRecords(1050), 1000);
  });

  it('snaps to the 50-record step', () => {
    assert.equal(clampRecords(170), 150);
    assert.equal(clampRecords(180), 200);
  });

  it('falls back to the minimum for non-numbers', () => {
    assert.equal(clampRecords(Number.NaN), 50);
  });
});

describe('quote', () => {
  it('charges records times the channel rate and adds the bonus to capacity', () => {
    assert.deepEqual(quote(150, 'whatsapp'), { total: 225, bonus: 10, capacity: 160 });
    assert.deepEqual(quote(300, 'sms'), { total: 300, bonus: 20, capacity: 320 });
    assert.deepEqual(quote(500, 'whatsapp_calls'), { total: 1000, bonus: 20, capacity: 520 });
  });
});
