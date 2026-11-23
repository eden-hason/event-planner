import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { toDeliverySteps } from './delivery-outcome.ts';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { buildJourney } from './schedule-results.ts';

const attempt = (over: Record<string, unknown>) => ({
  channel: 'whatsapp',
  status: 'failed',
  error_code: 131026,
  triggered_by: 'scheduled',
  sent_at: '2026-11-23T08:00:44Z',
  delivered_at: null,
  read_at: null,
  created_at: '2026-11-23T08:00:42Z',
  updated_at: '2026-11-23T08:00:54Z',
  ...over,
});

test('a failed WhatsApp the Guest replied to reads as delivered at the reply, never as failed', () => {
  const [step] = toDeliverySteps([attempt({ replied_at: '2026-11-23T08:03:16Z' })]);
  assert.equal(step.deliveredAt, '2026-11-23T08:03:16Z');
  assert.equal(step.failedAt, undefined);
  assert.equal(step.byReply, true);
});

test('a reply after a delivered receipt keeps the receipt, and is not marked as by reply', () => {
  const [step] = toDeliverySteps([
    attempt({
      status: 'delivered',
      error_code: null,
      delivered_at: '2026-11-23T08:00:50Z',
      replied_at: '2026-11-23T08:03:16Z',
    }),
  ]);
  assert.equal(step.deliveredAt, '2026-11-23T08:00:50Z');
  assert.equal(step.byReply, undefined);
});

test('a failure with no reply stays a failure', () => {
  const [step] = toDeliverySteps([attempt({})]);
  assert.equal(step.failedAt, '2026-11-23T08:00:54Z');
  assert.equal(step.deliveredAt, undefined);
});

test("the Owner's activity for a guest who replied: sent, delivered by reply, the answer", () => {
  const journey = buildJourney({
    guestId: 'g',
    guestName: 'עידן שלום',
    steps: toDeliverySteps([attempt({ replied_at: '2026-11-23T08:03:16Z' })]),
    delivery: 'whatsapp',
    seen: true,
    amount: 1,
    response: 'rsvp_confirm',
    respondedAt: '2026-11-23T08:03:22Z',
    guestCount: 1,
  });
  assert.deepEqual(
    journey.map((step: { kind: string; byReply?: true }) => [step.kind, step.byReply ?? false]),
    [
      ['sent', false],
      ['delivered', true],
      ['confirmed', false],
    ],
  );
});
