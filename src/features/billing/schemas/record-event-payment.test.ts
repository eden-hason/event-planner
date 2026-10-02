import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RecordEventPaymentSchema } from './index';

const base = {
  eventId: '00000000-0000-4000-8000-000000000001',
  records: 200,
  channel: 'whatsapp',
  amount: 300,
  method: 'bank_transfer',
};

describe('RecordEventPaymentSchema', () => {
  it('accepts a paid payment', () => {
    assert.equal(RecordEventPaymentSchema.safeParse(base).success, true);
  });

  it('accepts an Isracard payment', () => {
    assert.equal(RecordEventPaymentSchema.safeParse({ ...base, method: 'isracard' }).success, true);
  });

  it('accepts a gift at 0', () => {
    assert.equal(RecordEventPaymentSchema.safeParse({ ...base, amount: 0, method: 'gift' }).success, true);
  });

  it('refuses a gift with money attached', () => {
    assert.equal(RecordEventPaymentSchema.safeParse({ ...base, method: 'gift' }).success, false);
  });

  it('refuses a ₪0 payment that is not a gift', () => {
    assert.equal(RecordEventPaymentSchema.safeParse({ ...base, amount: 0 }).success, false);
  });

  it('refuses zero or fractional records', () => {
    assert.equal(RecordEventPaymentSchema.safeParse({ ...base, records: 0 }).success, false);
    assert.equal(RecordEventPaymentSchema.safeParse({ ...base, records: 1.5 }).success, false);
  });

  it('accepts agorot that floating point cannot represent exactly', () => {
    assert.equal(RecordEventPaymentSchema.safeParse({ ...base, amount: 19.99 }).success, true);
  });

  it('refuses more than two decimal places', () => {
    assert.equal(RecordEventPaymentSchema.safeParse({ ...base, amount: 10.005 }).success, false);
  });
});
