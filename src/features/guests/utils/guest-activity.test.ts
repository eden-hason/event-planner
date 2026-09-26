import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { buildGuestActivity, deliveryOutcome } from './guest-activity.ts';

type Input = Parameters<typeof buildGuestActivity>[0];
const empty: Input = {
  deliveries: [],
  calls: [],
  answers: [],
  manualChange: null,
};

test('a WhatsApp Delivery reads by how far it got', () => {
  assert.equal(
    deliveryOutcome({ status: 'read', channel: 'whatsapp' }),
    'seen',
  );
  assert.equal(
    deliveryOutcome({ status: 'delivered', channel: 'whatsapp' }),
    'reached',
  );
  assert.equal(
    deliveryOutcome({ status: 'sent', channel: 'whatsapp' }),
    'on_its_way',
  );
  assert.equal(
    deliveryOutcome({ status: 'pending', channel: 'whatsapp' }),
    'on_its_way',
  );
  assert.equal(
    deliveryOutcome({ status: 'failed', channel: 'whatsapp' }),
    'not_delivered',
  );
  assert.equal(
    deliveryOutcome({ status: 'not_sent', channel: null }),
    'no_phone',
  );
});

test('an accepted SMS is as reached as SMS gets', () => {
  assert.equal(deliveryOutcome({ status: 'sent', channel: 'sms' }), 'reached');
});

test('nothing at all is an empty timeline', () => {
  assert.deepEqual(buildGuestActivity(empty), []);
});

test('everything that happened to a Guest Record is merged newest first', () => {
  const items = buildGuestActivity({
    deliveries: [
      {
        scheduleTypeKey: 'initial_invitation',
        status: 'read',
        channel: 'whatsapp',
        viaFallback: false,
        at: '2026-09-01T07:00:00Z',
      },
      {
        scheduleTypeKey: 'confirmation',
        status: 'sent',
        channel: 'sms',
        viaFallback: true,
        at: '2026-09-10T07:00:00Z',
      },
    ],
    calls: [
      { roundNumber: 1, outcome: 'confirmed', at: '2026-09-18T11:18:00Z' },
    ],
    answers: [
      {
        response: 'confirmed',
        count: 2,
        channel: 'whatsapp',
        at: '2026-09-11T17:05:00Z',
      },
    ],
    manualChange: null,
  });
  assert.deepEqual(
    items.map((item) => item.kind),
    ['call', 'answer', 'delivery', 'delivery'],
  );
  const fallback = items[2];
  assert.equal(fallback.kind === 'delivery' && fallback.viaFallback, true);
  assert.equal(fallback.kind === 'delivery' && fallback.outcome, 'reached');
});

test('an RSVP the Owner typed in is its own entry', () => {
  const [item] = buildGuestActivity({
    ...empty,
    manualChange: {
      status: 'declined',
      at: '2026-09-02T10:00:00Z',
      byName: 'דנה',
      byCurrentUser: true,
    },
  });
  assert.deepEqual(item, {
    kind: 'rsvp',
    status: 'declined',
    at: '2026-09-02T10:00:00Z',
    byName: 'דנה',
    byCurrentUser: true,
  });
});

test('a Delivery with no time yet sorts after everything that has one', () => {
  const items = buildGuestActivity({
    ...empty,
    deliveries: [
      {
        scheduleTypeKey: 'confirmation',
        status: 'pending',
        channel: 'whatsapp',
        viaFallback: false,
        at: null,
      },
      {
        scheduleTypeKey: 'initial_invitation',
        status: 'delivered',
        channel: 'whatsapp',
        viaFallback: false,
        at: '2026-09-01T07:00:00Z',
      },
    ],
  });
  assert.deepEqual(
    items.map((item) => item.kind === 'delivery' && item.scheduleTypeKey),
    ['initial_invitation', 'confirmation'],
  );
});
