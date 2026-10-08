import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bonusRecords, clampRecords, quote } from './pricing';

describe('bonusRecords', () => {
  it('gives nothing below 150 records', () => {
    assert.equal(bonusRecords(50), 0);
    assert.equal(bonusRecords(140), 0);
  });

  it('gives 10 from 150 records, whatever the package size', () => {
    assert.equal(bonusRecords(150), 10);
    assert.equal(bonusRecords(1000), 10);
  });
});

describe('clampRecords', () => {
  it('keeps values inside the slider range', () => {
    assert.equal(clampRecords(0), 50);
    assert.equal(clampRecords(1050), 1000);
  });

  it('snaps to the 10-record step', () => {
    assert.equal(clampRecords(173), 170);
    assert.equal(clampRecords(176), 180);
  });

  it('falls back to the minimum for non-numbers', () => {
    assert.equal(clampRecords(Number.NaN), 50);
  });
});

describe('quote', () => {
  it('charges records times the channel rate and adds the bonus to the package', () => {
    assert.deepEqual(quote(150, 'whatsapp'), { total: 225, bonus: 10, packageSize: 160 });
    assert.deepEqual(quote(300, 'sms'), { total: 300, bonus: 10, packageSize: 310 });
    assert.deepEqual(quote(500, 'whatsapp_calls'), { total: 1000, bonus: 10, packageSize: 510 });
  });

  it('has no bonus below 150 records', () => {
    assert.deepEqual(quote(100, 'sms'), { total: 100, bonus: 0, packageSize: 100 });
  });
});
