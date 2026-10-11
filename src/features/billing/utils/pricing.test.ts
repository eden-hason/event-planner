import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GIFT_TRACK_END, clampRecords, quote, trackPct } from './pricing';

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
  it('charges records times the Plan rate and adds the bonus to the package', () => {
    assert.deepEqual(quote(150, 'whatsapp'), { total: 225, bonus: 0, packageSize: 150 });
    assert.deepEqual(quote(300, 'whatsapp'), { total: 450, bonus: 10, packageSize: 310 });
    assert.deepEqual(quote(500, 'whatsapp_calls'), { total: 1000, bonus: 20, packageSize: 520 });
  });
});

describe('trackPct', () => {
  it('runs from the slider minimum to the end of the track', () => {
    assert.equal(trackPct(50, GIFT_TRACK_END), 0);
    assert.equal(trackPct(GIFT_TRACK_END, GIFT_TRACK_END), 100);
  });

  it('pins counts outside the track to its ends', () => {
    assert.equal(trackPct(0, GIFT_TRACK_END), 0);
    assert.equal(trackPct(1000, GIFT_TRACK_END), 100);
  });
});
