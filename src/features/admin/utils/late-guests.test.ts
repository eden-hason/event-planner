import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  lateSendRejection,
  splitLateGuests,
  type LateDeliveryRow,
  type LateGuestRow,
} from './late-guests';

const SENT_AT = '2026-10-01T09:00:00Z';
const PHONE = '+972501234567';

// libphonenumber's metadata does not load under the test runner, so the phone
// rule is a stand-in: no phone, or a short one, has no usable number.
const phoneProblem = (phone: string | null) =>
  phone && phone.length > 8 ? null : 'אין מספר טלפון תקין';

function guest(id: string, overrides: Partial<LateGuestRow> = {}): LateGuestRow {
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

function delivery(guestId: string, overrides: Partial<LateDeliveryRow> = {}): LateDeliveryRow {
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
  deliveries: [] as LateDeliveryRow[],
  targetStatus: null,
  outsideIds: new Set<string>(),
  phoneProblem,
  sentAt: SENT_AT,
};

describe('splitLateGuests', () => {
  it('offers a guest added after the send, marked as such', () => {
    const split = splitLateGuests({
      ...base,
      guests: [guest('late', { createdAt: '2026-10-05T09:00:00Z' })],
    });
    assert.equal(split.eligible.length, 1);
    assert.equal(split.eligible[0].addedAfterSend, true);
    assert.equal(split.eligible[0].note, null);
  });

  it('never offers a guest who already received it, in any settled state', () => {
    const split = splitLateGuests({
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
    const split = splitLateGuests({
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
    const split = splitLateGuests({
      ...base,
      guests: [guest('stalled')],
      deliveries: [delivery('stalled', { status: 'pending' })],
    });
    assert.equal(split.eligible.length, 1);
    assert.equal(split.eligible[0].note, 'לא נשלח בזמנו');
  });

  it('offers a guest recorded as not sent whose phone was added since', () => {
    const split = splitLateGuests({
      ...base,
      guests: [guest('fixed')],
      deliveries: [delivery('fixed', { status: 'not_sent', notSentReason: 'no_phone' })],
    });
    assert.equal(split.eligible.length, 1);
    assert.match(split.eligible[0].note ?? '', /לא היה מספר טלפון/);
  });

  it('leaves failures to the resend on the timeline row', () => {
    const split = splitLateGuests({
      ...base,
      guests: [guest('failed')],
      deliveries: [delivery('failed', { status: 'failed' })],
    });
    assert.equal(split.eligible.length, 0);
    assert.equal(split.excluded.length, 1);
  });

  it('keeps to the target audience', () => {
    const split = splitLateGuests({
      ...base,
      targetStatus: 'pending',
      guests: [guest('pending'), guest('confirmed', { rsvpStatus: 'confirmed' })],
    });
    assert.deepEqual(split.eligible.map((g) => g.id), ['pending']);
    assert.equal(split.audienceCount, 1);
    assert.equal(split.excluded.length, 0);
  });

  it('excludes records outside the package and records with no usable phone', () => {
    const split = splitLateGuests({
      ...base,
      outsideIds: new Set(['outside']),
      guests: [guest('outside'), guest('nophone', { phone: null }), guest('bad', { phone: '123' })],
    });
    assert.equal(split.eligible.length, 0);
    assert.deepEqual(split.excluded.map((g) => g.id).sort(), ['bad', 'nophone', 'outside']);
  });

  it('gives the phone rule\'s own reason for an excluded record', () => {
    const split = splitLateGuests({
      ...base,
      phoneProblem: () => 'SMS only reaches Israel',
      guests: [guest('abroad')],
    });
    assert.equal(split.excluded[0].reason, 'SMS only reaches Israel');
  });

  it('lists the late additions first, newest first', () => {
    const split = splitLateGuests({
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

describe('lateSendRejection', () => {
  const sent = {
    status: 'sent',
    dispatchedAt: SENT_AT,
    scheduleTypeKey: 'initial_invitation',
    eventDate: '2026-12-01',
    now: new Date('2026-10-10T09:00:00Z'),
  };

  it('allows a schedule that went out, by status or by claim', () => {
    assert.equal(lateSendRejection(sent), null);
    assert.equal(lateSendRejection({ ...sent, status: null }), null);
  });

  it('refuses one that has not gone out yet, or never will', () => {
    assert.ok(lateSendRejection({ ...sent, status: null, dispatchedAt: null }));
    assert.ok(lateSendRejection({ ...sent, status: 'cancelled' }));
    assert.ok(lateSendRejection({ ...sent, status: 'expired', dispatchedAt: null }));
    assert.ok(lateSendRejection({ ...sent, status: 'disabled', dispatchedAt: null }));
  });

  it('refuses once the event day has ended, except for the thank-you', () => {
    const after = { ...sent, now: new Date('2026-12-02T09:00:00Z') };
    assert.ok(lateSendRejection(after));
    assert.equal(lateSendRejection({ ...after, scheduleTypeKey: 'post_event' }), null);
    // Still the event day itself
    assert.equal(lateSendRejection({ ...sent, now: new Date('2026-12-01T18:00:00Z') }), null);
  });
});
