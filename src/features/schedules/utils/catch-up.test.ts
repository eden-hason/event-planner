import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  catchUpRejection,
  missedCatchUpIds,
  pickCatchUpSchedule,
  splitCatchUp,
  type CatchUpDeliveryRow,
  type CatchUpGuestRow,
  type CatchUpScheduleRow,
} from './catch-up';

const SENT_AT = '2026-10-01T09:00:00Z';
const PHONE = '+972501234567';

// libphonenumber's metadata does not load under the test runner, so the phone
// rule is a stand-in: no phone, or a short one, has no usable number.
const phoneProblem = (phone: string | null) =>
  phone && phone.length > 8 ? null : ('no_phone' as const);

function guest(id: string, overrides: Partial<CatchUpGuestRow> = {}): CatchUpGuestRow {
  return {
    id,
    name: `Guest ${id}`,
    phone: PHONE,
    rsvpStatus: 'pending',
    groupName: null,
    createdAt: '2026-09-20T09:00:00Z',
    ...overrides,
  };
}

function delivery(guestId: string, overrides: Partial<CatchUpDeliveryRow> = {}): CatchUpDeliveryRow {
  return {
    guestId,
    status: 'sent',
    queued: false,
    attemptPending: false,
    notSentReason: null,
    ...overrides,
  };
}

const base = {
  deliveries: [] as CatchUpDeliveryRow[],
  targetStatus: null,
  outsideIds: new Set<string>(),
  phoneProblem,
  sentAt: SENT_AT,
};

describe('splitCatchUp', () => {
  it('offers a guest added after the send, marked as such', () => {
    const split = splitCatchUp({
      ...base,
      guests: [guest('late', { createdAt: '2026-10-05T09:00:00Z' })],
    });
    assert.equal(split.eligible.length, 1);
    assert.equal(split.eligible[0].addedAfterSend, true);
    assert.equal(split.eligible[0].note, null);
  });

  it('never offers a guest who already received it, in any settled state', () => {
    const split = splitCatchUp({
      ...base,
      guests: [guest('a'), guest('b'), guest('c')],
      deliveries: [
        delivery('a', { status: 'sent' }),
        delivery('b', { status: 'delivered' }),
        delivery('c', { status: 'read' }),
      ],
    });
    assert.equal(split.eligible.length, 0);
    assert.equal(split.reachedCount, 3);
  });

  it('holds back a send already under way, so a second press cannot race it', () => {
    const split = splitCatchUp({
      ...base,
      guests: [guest('queued'), guest('attempting')],
      deliveries: [
        delivery('queued', { status: 'pending', queued: true }),
        delivery('attempting', { status: 'pending', attemptPending: true }),
      ],
    });
    assert.equal(split.eligible.length, 0);
    assert.equal(split.inFlightCount, 2);
  });

  it('offers a reservation nothing ever attempted', () => {
    const split = splitCatchUp({
      ...base,
      guests: [guest('stalled')],
      deliveries: [delivery('stalled', { status: 'pending' })],
    });
    assert.equal(split.eligible.length, 1);
    assert.equal(split.eligible[0].note, 'other');
  });

  it('offers a guest recorded as not sent whose phone was added since', () => {
    const split = splitCatchUp({
      ...base,
      guests: [guest('fixed')],
      deliveries: [delivery('fixed', { status: 'not_sent', notSentReason: 'no_phone' })],
    });
    assert.equal(split.eligible.length, 1);
    assert.equal(split.eligible[0].note, 'no_phone');
  });

  it('leaves failures to the Operator, with the reason', () => {
    const split = splitCatchUp({
      ...base,
      guests: [guest('failed')],
      deliveries: [delivery('failed', { status: 'failed' })],
    });
    assert.equal(split.eligible.length, 0);
    assert.deepEqual(split.excluded.map((g) => g.reason), ['failed']);
  });

  it('keeps to the target audience', () => {
    const split = splitCatchUp({
      ...base,
      targetStatus: 'pending',
      guests: [guest('pending'), guest('confirmed', { rsvpStatus: 'confirmed' })],
    });
    assert.deepEqual(split.eligible.map((g) => g.id), ['pending']);
    assert.equal(split.audienceCount, 1);
    assert.equal(split.excluded.length, 0);
  });

  it('excludes records outside the package and records with no usable phone', () => {
    const split = splitCatchUp({
      ...base,
      outsideIds: new Set(['outside']),
      guests: [guest('outside'), guest('nophone', { phone: null }), guest('bad', { phone: '123' })],
    });
    assert.equal(split.eligible.length, 0);
    assert.deepEqual(split.excluded.map((g) => [g.id, g.reason]).sort(), [
      ['bad', 'no_phone'],
      ['nophone', 'no_phone'],
      ['outside', 'outside_package'],
    ]);
  });

  it('gives the phone rule\'s own reason for an excluded record', () => {
    const split = splitCatchUp({
      ...base,
      phoneProblem: () => 'sms_abroad' as const,
      guests: [guest('abroad')],
    });
    assert.equal(split.excluded[0].reason, 'sms_abroad');
  });

  it('lists the late additions first, newest first', () => {
    const split = splitCatchUp({
      ...base,
      guests: [
        guest('older-missed', { createdAt: '2026-09-01T09:00:00Z' }),
        guest('late-1', { createdAt: '2026-10-02T09:00:00Z' }),
        guest('late-2', { createdAt: '2026-10-08T09:00:00Z' }),
      ],
    });
    assert.deepEqual(split.eligible.map((g) => g.id), ['late-2', 'late-1', 'older-missed']);
  });
});

describe('catchUpRejection', () => {
  const sent = {
    status: 'sent',
    dispatchedAt: SENT_AT,
    scheduleTypeKey: 'initial_invitation',
    eventDate: '2026-12-01',
    now: new Date('2026-10-10T09:00:00Z'),
  };

  it('allows a schedule that went out, by status or by claim', () => {
    assert.equal(catchUpRejection(sent), null);
    assert.equal(catchUpRejection({ ...sent, status: null }), null);
  });

  it('refuses one that has not gone out yet, or never will', () => {
    assert.equal(catchUpRejection({ ...sent, status: null, dispatchedAt: null }), 'not_sent_yet');
    assert.equal(catchUpRejection({ ...sent, status: 'cancelled' }), 'cancelled');
    assert.equal(catchUpRejection({ ...sent, status: 'expired', dispatchedAt: null }), 'expired');
    assert.equal(catchUpRejection({ ...sent, status: 'disabled', dispatchedAt: null }), 'disabled');
  });

  it('refuses once the event day has ended, except for the thank-you', () => {
    const after = { ...sent, now: new Date('2026-12-02T09:00:00Z') };
    assert.equal(catchUpRejection(after), 'event_over');
    assert.equal(catchUpRejection({ ...after, scheduleTypeKey: 'post_event' }), null);
    // Still the event day itself
    assert.equal(catchUpRejection({ ...sent, now: new Date('2026-12-01T18:00:00Z') }), null);
  });
});

describe('pickCatchUpSchedule', () => {
  function schedule(
    id: string,
    overrides: Partial<CatchUpScheduleRow> = {},
  ): CatchUpScheduleRow {
    return {
      id,
      typeKey: 'confirmation',
      status: 'sent',
      sentAt: '2026-10-01T09:00:00Z',
      dispatchedAt: '2026-10-01T09:00:00Z',
      ...overrides,
    };
  }

  it('takes the latest Confirmation round that went out', () => {
    const picked = pickCatchUpSchedule([
      schedule('round-1'),
      schedule('round-2', {
        sentAt: '2026-10-08T09:00:00+00:00',
        dispatchedAt: null,
      }),
      schedule('round-3', { status: null, sentAt: null, dispatchedAt: null }),
    ]);
    assert.equal(picked?.id, 'round-2');
  });

  it('counts a claimed Confirmation as gone out, by its claim time', () => {
    const picked = pickCatchUpSchedule([
      schedule('round-1'),
      schedule('claimed', {
        status: null,
        sentAt: null,
        dispatchedAt: '2026-10-09T09:00:00Z',
      }),
    ]);
    assert.equal(picked?.id, 'claimed');
  });

  it('takes the Invitation while it is the only message that went out', () => {
    const picked = pickCatchUpSchedule([
      schedule('invite', { typeKey: 'initial_invitation' }),
      schedule('round-1', { status: null, sentAt: null, dispatchedAt: null }),
    ]);
    assert.equal(picked?.id, 'invite');
  });

  it('moves on to a Confirmation once one has gone out after the Invitation', () => {
    const picked = pickCatchUpSchedule([
      schedule('invite', { typeKey: 'initial_invitation' }),
      schedule('round-1', { sentAt: '2026-10-05T09:00:00Z' }),
    ]);
    assert.equal(picked?.id, 'round-1');
  });

  it('never takes an Event Reminder or Thank You, however late it went', () => {
    const picked = pickCatchUpSchedule([
      schedule('round-1'),
      schedule('reminder', { typeKey: 'event_reminder', sentAt: '2026-10-20T09:00:00Z' }),
      schedule('thanks', { typeKey: 'post_event', sentAt: '2026-10-22T09:00:00Z' }),
    ]);
    assert.equal(picked?.id, 'round-1');
    assert.equal(
      pickCatchUpSchedule([schedule('reminder', { typeKey: 'event_reminder' })]),
      null,
    );
  });

  it('never takes a cancelled one', () => {
    assert.equal(pickCatchUpSchedule([schedule('cancelled', { status: 'cancelled' })]), null);
  });
});

describe('missedCatchUpIds', () => {
  it('lists audience guests with no Delivery or a Not sent one, never failures or the reached', () => {
    const ids = missedCatchUpIds(
      [
        guest('late', { createdAt: '2026-10-05T09:00:00Z' }),
        guest('no-phone-then'),
        guest('reached'),
        guest('failed'),
        guest('queued'),
        guest('confirmed', { rsvpStatus: 'confirmed' }),
      ],
      {
        targetStatus: 'pending',
        sentAt: SENT_AT,
        deliveries: [
          delivery('no-phone-then', { status: 'not_sent', notSentReason: 'no_phone' }),
          delivery('reached', { status: 'read' }),
          delivery('failed', { status: 'failed' }),
          delivery('queued', { status: 'pending', queued: true }),
        ],
      },
    );
    assert.deepEqual(ids, ['late', 'no-phone-then']);
  });
});
