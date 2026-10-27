import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RecordEventPaymentSchema } from './index';

const base = {
  eventId: '00000000-0000-4000-8000-000000000001',
  kind: 'plan',
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

  it('accepts both Plans on sale', () => {
    assert.equal(RecordEventPaymentSchema.safeParse({ ...base, channel: 'whatsapp_calls' }).success, true);
  });

  it('refuses SMS, which is no longer sold', () => {
    assert.equal(RecordEventPaymentSchema.safeParse({ ...base, channel: 'sms' }).success, false);
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

  it('refuses a payment that does not say what it bought', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropped on purpose
    const { kind, ...unkinded } = base;
    assert.equal(RecordEventPaymentSchema.safeParse(unkinded).success, false);
  });

  it('accepts a Top-up the same way as a Plan', () => {
    assert.equal(RecordEventPaymentSchema.safeParse({ ...base, kind: 'top_up', records: 30 }).success, true);
  });
});

describe('RecordEventPaymentSchema for an Extra Schedule', () => {
  const extra = {
    eventId: base.eventId,
    kind: 'extra_schedule',
    schedules: 1,
    amount: 120,
    method: 'bit',
  };

  it('accepts schedules with no records or channel', () => {
    const parsed = RecordEventPaymentSchema.safeParse(extra);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data && 'records' in parsed.data, false);
  });

  it('refuses zero or fractional schedules', () => {
    assert.equal(RecordEventPaymentSchema.safeParse({ ...extra, schedules: 0 }).success, false);
    assert.equal(RecordEventPaymentSchema.safeParse({ ...extra, schedules: 1.5 }).success, false);
  });

  it('holds to the gift rule like any payment', () => {
    assert.equal(RecordEventPaymentSchema.safeParse({ ...extra, amount: 0, method: 'gift' }).success, true);
    assert.equal(RecordEventPaymentSchema.safeParse({ ...extra, amount: 0 }).success, false);
  });
});
