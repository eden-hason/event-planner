import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GuestInteractionRow } from '@/features/schedules/utils/delivery-outcome';
import type { GuestJourneyDelivery } from '@/features/schedules/services/guest-journeys';
import {
  buildGuestCommunication,
  type CommunicationSchedule,
  type GuestCommunicationInput,
} from './guest-communication';

const NOW = new Date('2026-10-20T09:00:00Z');
const SENT_AT = '2026-10-10T09:00:00Z';

function schedule(
  id: string,
  overrides: Partial<CommunicationSchedule> = {},
): CommunicationSchedule {
  return {
    id,
    typeKey: 'confirmation',
    kind: 'message',
    status: 'sent',
    targetStatus: 'pending',
    scheduledDate: SENT_AT,
    sentAt: SENT_AT,
    dispatchedAt: SENT_AT,
    ...overrides,
  };
}

function journey(
  overrides: Partial<GuestInteractionRow> = {},
): GuestInteractionRow {
  return {
    guestId: 'g',
    guestName: 'Dana',
    steps: [],
    viaFallback: false,
    delivery: 'whatsapp',
    seen: false,
    amount: 2,
    ...overrides,
  };
}

function delivery(
  scheduleId: string,
  overrides: Partial<GuestJourneyDelivery> = {},
): GuestJourneyDelivery {
  return {
    scheduleId,
    status: 'delivered',
    queued: false,
    attemptPending: false,
    notSentReason: null,
    journey: journey(),
    ...overrides,
  };
}

function input(
  overrides: Partial<GuestCommunicationInput> = {},
): GuestCommunicationInput {
  return {
    guest: {
      id: 'g',
      name: 'Dana',
      rsvpStatus: 'pending',
      amount: 2,
      createdAt: '2026-09-01T09:00:00Z',
      rsvpChangeSource: null,
      rsvpChangedAt: null,
      rsvpChangedByName: null,
      rsvpChangedByCurrentUser: false,
    },
    eventDate: '2026-12-01',
    canSend: true,
    outsidePackage: false,
    schedules: [],
    deliveries: [],
    calls: [],
    answers: [],
    catchUpPhoneProblem: null,
    ...overrides,
  };
}

const lateGuest = (
  overrides: Partial<GuestCommunicationInput['guest']> = {},
) => ({
  ...input().guest,
  createdAt: '2026-10-12T09:00:00Z',
  ...overrides,
});

const rowOf = (
  communication: ReturnType<typeof buildGuestCommunication>,
  id: string,
) => communication.rows.find((row) => row.scheduleId === id);

describe('buildGuestCommunication states', () => {
  it('reads a Delivery by how far it got', () => {
    const result = buildGuestCommunication(
      input({
        schedules: [schedule('a'), schedule('b'), schedule('c')],
        deliveries: [
          delivery('a', { journey: journey({ seen: true }) }),
          delivery('b'),
          delivery('c', {
            status: 'failed',
            journey: journey({ delivery: 'not_delivered' }),
          }),
        ],
      }),
      NOW,
    );
    assert.deepEqual(
      result.rows.map((row) => row.state),
      ['seen', 'reached', 'not_delivered'],
    );
  });

  it('tells a guest added after the send from one who was never in its audience', () => {
    const sent = [schedule('sent')];
    assert.equal(
      rowOf(
        buildGuestCommunication(
          input({ guest: lateGuest(), schedules: sent }),
          NOW,
        ),
        'sent',
      )?.state,
      'added_after',
    );
    assert.equal(
      rowOf(buildGuestCommunication(input({ schedules: sent }), NOW), 'sent')
        ?.state,
      'not_in_audience',
    );
  });

  it('says whether a planned Schedule will reach them, by its audience today', () => {
    const planned = schedule('planned', {
      status: null,
      sentAt: null,
      dispatchedAt: null,
      scheduledDate: '2026-11-01T08:00:00Z',
    });
    assert.equal(
      rowOf(
        buildGuestCommunication(input({ schedules: [planned] }), NOW),
        'planned',
      )?.state,
      'will_get',
    );
    const confirmed = { ...input().guest, rsvpStatus: 'confirmed' };
    assert.equal(
      rowOf(
        buildGuestCommunication(
          input({ guest: confirmed, schedules: [planned] }),
          NOW,
        ),
        'planned',
      )?.state,
      'not_in_audience',
    );
  });

  it('shows undated, locked and expired Schedules, and hides cancelled ones', () => {
    const result = buildGuestCommunication(
      input({
        schedules: [
          schedule('undated', {
            status: null,
            sentAt: null,
            dispatchedAt: null,
            scheduledDate: null,
          }),
          schedule('locked', {
            status: 'disabled',
            sentAt: null,
            dispatchedAt: null,
          }),
          schedule('expired', {
            status: 'expired',
            sentAt: null,
            dispatchedAt: null,
          }),
          schedule('cancelled', {
            status: 'cancelled',
            sentAt: null,
            dispatchedAt: null,
          }),
        ],
      }),
      NOW,
    );
    assert.equal(rowOf(result, 'undated')?.state, 'undated');
    assert.equal(rowOf(result, 'locked')?.state, 'locked');
    assert.equal(rowOf(result, 'expired')?.state, 'off');
    assert.equal(rowOf(result, 'cancelled'), undefined);
  });

  it("reads a Call Round by the guest's place on its list", () => {
    const call = (id: string, overrides: Partial<CommunicationSchedule> = {}) =>
      schedule(id, { typeKey: 'phone_call', kind: 'call', ...overrides });
    const result = buildGuestCommunication(
      input({
        schedules: [
          call('called'),
          call('queued'),
          call('skipped'),
          call('planned', {
            status: null,
            sentAt: null,
            dispatchedAt: null,
            scheduledDate: '2026-11-05T08:00:00Z',
          }),
        ],
        calls: [
          { scheduleId: 'called', outcome: 'no_answer' },
          { scheduleId: 'queued', outcome: null },
        ],
      }),
      NOW,
    );
    assert.equal(rowOf(result, 'called')?.state, 'called');
    assert.equal(rowOf(result, 'queued')?.state, 'call_queued');
    assert.equal(rowOf(result, 'skipped')?.state, 'not_in_audience');
    assert.equal(rowOf(result, 'planned')?.state, 'call_planned');
  });

  it('numbers a type that appears more than once, in plan order', () => {
    const result = buildGuestCommunication(
      input({
        schedules: [
          schedule('second', {
            scheduledDate: '2026-10-15T09:00:00Z',
            sentAt: '2026-10-15T09:00:00Z',
          }),
          schedule('first'),
          schedule('invite', {
            typeKey: 'initial_invitation',
            targetStatus: null,
            scheduledDate: '2026-09-20T09:00:00Z',
          }),
        ],
      }),
      NOW,
    );
    assert.deepEqual(
      result.rows.map((row) => row.scheduleId),
      ['invite', 'first', 'second'],
    );
    assert.deepEqual(rowOf(result, 'second')?.number, { index: 2, total: 2 });
    assert.equal(rowOf(result, 'invite')?.number, null);
  });
});

describe('buildGuestCommunication catch-up', () => {
  const rounds = [
    schedule('round-1'),
    schedule('round-2', {
      scheduledDate: '2026-10-15T09:00:00Z',
      sentAt: '2026-10-15T09:00:00Z',
    }),
    schedule('invite', { typeKey: 'initial_invitation', targetStatus: null }),
  ];

  it('is offered only on the latest Invitation or Confirmation that went out', () => {
    const result = buildGuestCommunication(
      input({
        guest: lateGuest({ createdAt: '2026-10-16T09:00:00Z' }),
        schedules: rounds,
      }),
      NOW,
    );
    assert.deepEqual(rowOf(result, 'round-2')?.catchUp, { available: true });
    assert.equal(rowOf(result, 'round-1')?.catchUp, null);
    assert.equal(rowOf(result, 'invite')?.catchUp, null);
  });

  it('is offered on the Invitation while nothing else has gone out, and the plan still reaches them', () => {
    const plan = [
      schedule('invite', { typeKey: 'initial_invitation', targetStatus: null }),
      schedule('round-1', {
        targetStatus: null,
        status: null,
        sentAt: null,
        dispatchedAt: null,
        scheduledDate: '2026-11-01T08:00:00Z',
      }),
    ];
    const result = buildGuestCommunication(input({ guest: lateGuest(), schedules: plan }), NOW);
    assert.equal(rowOf(result, 'invite')?.state, 'added_after');
    assert.deepEqual(rowOf(result, 'invite')?.catchUp, { available: true });
    assert.equal(rowOf(result, 'round-1')?.state, 'will_get');
    assert.equal(rowOf(result, 'round-1')?.catchUp, null);
  });

  it('stays on the last Confirmation once an Event Reminder has gone out', () => {
    const result = buildGuestCommunication(
      input({
        guest: lateGuest({ createdAt: '2026-10-16T09:00:00Z' }),
        schedules: [
          ...rounds,
          schedule('reminder', {
            typeKey: 'event_reminder',
            targetStatus: 'confirmed',
            scheduledDate: '2026-10-18T09:00:00Z',
            sentAt: '2026-10-18T09:00:00Z',
          }),
        ],
      }),
      NOW,
    );
    assert.equal(rowOf(result, 'reminder')?.catchUp, null);
    assert.equal(rowOf(result, 'round-2')?.catchUp?.available, true);
  });

  it('is offered for a Not sent Delivery whose phone came since', () => {
    const result = buildGuestCommunication(
      input({
        schedules: rounds,
        deliveries: [
          delivery('round-2', {
            status: 'not_sent',
            notSentReason: 'no_phone',
            journey: journey({ delivery: 'no_phone' }),
          }),
        ],
      }),
      NOW,
    );
    assert.deepEqual(rowOf(result, 'round-2')?.catchUp, { available: true });
  });

  it('says nothing for a guest already reached, mid-send, or not in the audience', () => {
    const reached = buildGuestCommunication(
      input({ schedules: rounds, deliveries: [delivery('round-2')] }),
      NOW,
    );
    assert.equal(rowOf(reached, 'round-2')?.catchUp, null);

    const inFlight = buildGuestCommunication(
      input({
        schedules: rounds,
        deliveries: [
          delivery('round-2', {
            status: 'pending',
            queued: true,
            journey: journey({ delivery: 'on_its_way' }),
          }),
        ],
      }),
      NOW,
    );
    assert.equal(rowOf(inFlight, 'round-2')?.catchUp, null);

    const confirmed = buildGuestCommunication(
      input({
        guest: lateGuest({ rsvpStatus: 'confirmed' }),
        schedules: rounds,
      }),
      NOW,
    );
    assert.equal(rowOf(confirmed, 'round-2')?.catchUp, null);
  });

  it('explains why a guest who missed it cannot be sent it', () => {
    const reasonOf = (
      overrides: Partial<GuestCommunicationInput>,
      now = NOW,
    ) => {
      const result = buildGuestCommunication(
        input({ guest: lateGuest(), schedules: rounds, ...overrides }),
        now,
      );
      const offer = rowOf(result, 'round-2')?.catchUp;
      return offer && !offer.available ? offer.reason : null;
    };
    assert.equal(
      reasonOf({
        deliveries: [
          delivery('round-2', {
            status: 'failed',
            journey: journey({ delivery: 'not_delivered' }),
          }),
        ],
      }),
      'failed',
    );
    assert.equal(reasonOf({ outsidePackage: true }), 'outside_package');
    assert.equal(reasonOf({ catchUpPhoneProblem: 'no_phone' }), 'no_phone');
    assert.equal(reasonOf({ canSend: false }), 'sending_off');
    // The RSVP Cutoff: the end of the Event day.
    assert.equal(reasonOf({}, new Date('2026-12-02T09:00:00Z')), 'event_over');
    assert.equal(reasonOf({}, new Date('2026-12-01T18:00:00Z')), null);
  });
});

describe('buildGuestCommunication RSVP summary', () => {
  it('has no source before anyone answered', () => {
    assert.deepEqual(buildGuestCommunication(input(), NOW).rsvp, {
      status: 'pending',
      amount: null,
      source: null,
    });
  });

  it('names where the Guest answered from their latest answer', () => {
    const result = buildGuestCommunication(
      input({
        guest: {
          ...input().guest,
          rsvpStatus: 'confirmed',
          rsvpChangeSource: 'guest',
          rsvpChangedAt: '2026-10-12T10:00:00Z',
        },
        answers: [
          { channel: 'web', at: '2026-10-11T10:00:00Z' },
          { channel: 'whatsapp', at: '2026-10-12T10:00:00Z' },
        ],
      }),
      NOW,
    );
    assert.deepEqual(result.rsvp, {
      status: 'confirmed',
      amount: 2,
      source: { kind: 'chat', at: '2026-10-12T10:00:00Z' },
    });
  });

  it("credits an Owner's change and an Operator's call", () => {
    const manual = buildGuestCommunication(
      input({
        guest: {
          ...input().guest,
          rsvpStatus: 'declined',
          rsvpChangeSource: 'manual',
          rsvpChangedAt: '2026-10-13T10:00:00Z',
          rsvpChangedByName: 'Noa',
        },
      }),
      NOW,
    );
    assert.deepEqual(manual.rsvp.source, {
      kind: 'manual',
      at: '2026-10-13T10:00:00Z',
      byName: 'Noa',
      byCurrentUser: false,
    });

    const call = buildGuestCommunication(
      input({
        guest: {
          ...input().guest,
          rsvpStatus: 'confirmed',
          rsvpChangeSource: 'admin_call',
          rsvpChangedAt: '2026-10-14T10:00:00Z',
        },
      }),
      NOW,
    );
    assert.deepEqual(call.rsvp.source, {
      kind: 'call',
      at: '2026-10-14T10:00:00Z',
    });
  });
});
