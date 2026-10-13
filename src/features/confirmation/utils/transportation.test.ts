import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConfirmationFormSchema } from '../schemas';
import {
  fromTransportationField,
  pageTransportationUpdate,
  toTransportationField,
} from './transportation';

describe('pageTransportationUpdate', () => {
  it('never writes when the Event does not ask', () => {
    for (const answer of ['yes', 'no', undefined] as const) {
      assert.equal(pageTransportationUpdate({ asked: false, confirmed: true, answer }), undefined);
      assert.equal(pageTransportationUpdate({ asked: false, confirmed: false, answer }), undefined);
    }
  });

  it('stores yes and no for a Guest who is coming', () => {
    assert.equal(pageTransportationUpdate({ asked: true, confirmed: true, answer: 'yes' }), true);
    assert.equal(pageTransportationUpdate({ asked: true, confirmed: true, answer: 'no' }), false);
  });

  it('keeps no answer as unanswered, not "no"', () => {
    assert.equal(pageTransportationUpdate({ asked: true, confirmed: true, answer: undefined }), null);
  });

  it('clears the answer when the Guest is not coming', () => {
    assert.equal(pageTransportationUpdate({ asked: true, confirmed: false, answer: 'yes' }), null);
  });
});

describe('toTransportationField', () => {
  it('maps the three states', () => {
    assert.equal(toTransportationField(true), 'yes');
    assert.equal(toTransportationField(false), 'no');
    assert.equal(toTransportationField(null), null);
  });

  it('round-trips through fromTransportationField', () => {
    for (const value of [true, false, null]) {
      assert.equal(fromTransportationField(toTransportationField(value)), value);
    }
    assert.equal(fromTransportationField('null'), null);
  });
});

describe('ConfirmationFormSchema', () => {
  const base = { token: 'AbCdEf123456', rsvpStatus: 'confirmed' };

  it('still accepts a submission without the transportation field', () => {
    const parsed = ConfirmationFormSchema.safeParse(base);
    assert.ok(parsed.success);
    assert.equal(parsed.data.needsTransportation, undefined);
  });

  it('accepts exactly "yes" and "no"', () => {
    assert.ok(ConfirmationFormSchema.safeParse({ ...base, needsTransportation: 'yes' }).success);
    assert.ok(ConfirmationFormSchema.safeParse({ ...base, needsTransportation: 'no' }).success);
    assert.equal(ConfirmationFormSchema.safeParse({ ...base, needsTransportation: 'maybe' }).success, false);
  });
});
