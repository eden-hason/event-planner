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
      amount: 2,
      at: '2026-09-02T10:00:00Z',
      byName: 'דנה',
      byCurrentUser: true,
    },
  });
  assert.deepEqual(item, {
    kind: 'rsvp',
    status: 'declined',
    amount: 2,
    at: '2026-09-02T10:00:00Z',
    byName: 'דנה',
    byCurrentUser: true,
    countOnly: false,
  });
});

const ownerConfirms = (at: string) => ({
  status: 'confirmed' as const,
  amount: 4,
  at,
  byName: null,
  byCurrentUser: true,
});

const rsvpItem = (input: Input) => {
  const item = buildGuestActivity(input).find((entry) => entry.kind === 'rsvp');
  assert.ok(item && item.kind === 'rsvp');
  return item;
};

test('the Owner changing a confirmed Guest’s count is a count change, not a new answer', () => {
  const item = rsvpItem({
    ...empty,
    answers: [
      {
        response: 'confirmed',
        count: 1,
        channel: 'web',
        at: '2026-09-19T13:05:00Z',
      },
    ],
    manualChange: ownerConfirms('2026-09-26T16:49:00Z'),
  });
  assert.equal(item.countOnly, true);
  assert.equal(item.amount, 4);
});

test('a count confirmed on a call is the answer the Owner then changes', () => {
  const item = rsvpItem({
    ...empty,
    calls: [
      { roundNumber: 1, outcome: 'confirmed', at: '2026-09-19T13:05:00Z' },
    ],
    manualChange: ownerConfirms('2026-09-26T16:49:00Z'),
  });
  assert.equal(item.countOnly, true);
});

test('confirming a Guest who had declined is a new answer', () => {
  const item = rsvpItem({
    ...empty,
    answers: [
      {
        response: 'confirmed',
        count: 2,
        channel: 'whatsapp',
        at: '2026-09-10T10:00:00Z',
      },
      {
        response: 'declined',
        count: null,
        channel: 'whatsapp',
        at: '2026-09-19T13:05:00Z',
      },
    ],
    manualChange: ownerConfirms('2026-09-26T16:49:00Z'),
  });
  assert.equal(item.countOnly, false);
});

test('confirming a Guest nobody heard from is a new answer', () => {
  const item = rsvpItem({
    ...empty,
    manualChange: ownerConfirms('2026-09-26T16:49:00Z'),
  });
  assert.equal(item.countOnly, false);
});

test('an answer that came after the Owner’s change does not describe it', () => {
  const item = rsvpItem({
    ...empty,
    answers: [
      {
        response: 'confirmed',
        count: 1,
        channel: 'web',
        at: '2026-09-27T09:00:00Z',
      },
    ],
    manualChange: ownerConfirms('2026-09-26T16:49:00Z'),
  });
  assert.equal(item.countOnly, false);
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
