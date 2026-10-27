import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EventPayment } from '../types';
import { isRecordsPayment, paymentKindBlocker } from './payment-kinds';

const base = {
  id: 'p',
  amount: 100,
  method: 'bit',
  reference: null,
  note: null,
  createdBy: null,
  occurredAt: '2026-10-27T10:00:00Z',
} as const;

describe('isRecordsPayment', () => {
  it('counts the Plan and Top-ups, not an Extra Schedule', () => {
    const payments: EventPayment[] = [
      { ...base, kind: 'plan', records: 200, channel: 'whatsapp' },
      { ...base, kind: 'top_up', records: 30, channel: 'whatsapp' },
      { ...base, kind: 'extra_schedule', schedules: 1 },
    ];
    assert.deepEqual(
      payments.filter(isRecordsPayment).map((p) => p.records),
      [200, 30],
    );
  });
});

describe('paymentKindBlocker', () => {
  it('opens a package only once', () => {
    assert.equal(paymentKindBlocker('plan', false), null);
    assert.notEqual(paymentKindBlocker('plan', true), null);
  });

  it('needs a Plan before any upsale', () => {
    for (const kind of ['top_up', 'extra_schedule'] as const) {
      assert.notEqual(paymentKindBlocker(kind, false), null);
      assert.equal(paymentKindBlocker(kind, true), null);
    }
  });
});
