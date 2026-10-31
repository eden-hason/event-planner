import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  conversionRejection,
  deletionRejection,
  dueTimeRejection,
  type ScheduleControlState,
} from './schedule-controls';

const invitation: ScheduleControlState = {
  scheduleTypeKey: 'initial_invitation',
  kind: 'message',
  status: null,
  dispatchedAt: null,
  sentAt: null,
  hasRound: false,
};

describe('dueTimeRejection', () => {
  it('allows an active, turned-off or locked schedule', () => {
    assert.equal(dueTimeRejection(invitation), null);
    assert.equal(dueTimeRejection({ ...invitation, status: 'cancelled' }), null);
    assert.equal(dueTimeRejection({ ...invitation, status: 'disabled' }), null);
  });

  it('refuses one that went out, by status or by claim', () => {
    assert.ok(dueTimeRejection({ ...invitation, status: 'sent' }));
    assert.ok(dueTimeRejection({ ...invitation, dispatchedAt: '2026-10-01T07:00:00Z' }));
  });

  it('refuses an expired schedule', () => {
    assert.ok(dueTimeRejection({ ...invitation, status: 'expired' }));
  });

  it('lets a call plan move until a round is started from it', () => {
    const call = { ...invitation, scheduleTypeKey: 'phone_call', kind: 'call' as const };
    assert.equal(dueTimeRejection(call), null);
    assert.ok(dueTimeRejection({ ...call, hasRound: true }));
  });
});

describe('conversionRejection', () => {
  it('converts an Initial Invitation that has not gone out, locked or not', () => {
    assert.equal(conversionRejection(invitation), null);
    assert.equal(conversionRejection({ ...invitation, status: 'disabled' }), null);
    assert.equal(conversionRejection({ ...invitation, status: 'cancelled' }), null);
  });

  it('refuses any other schedule type', () => {
    assert.ok(conversionRejection({ ...invitation, scheduleTypeKey: 'confirmation' }));
  });

  it('refuses an invitation that went out or expired', () => {
    assert.ok(conversionRejection({ ...invitation, sentAt: '2026-10-01T07:00:00Z' }));
    assert.ok(conversionRejection({ ...invitation, status: 'expired' }));
  });
});

describe('deletionRejection', () => {
  it('deletes an Initial Invitation that has not gone out, in any unsent state', () => {
    assert.equal(deletionRejection(invitation), null);
    assert.equal(deletionRejection({ ...invitation, status: 'disabled' }), null);
    assert.equal(deletionRejection({ ...invitation, status: 'cancelled' }), null);
    assert.equal(deletionRejection({ ...invitation, status: 'expired' }), null);
  });

  it('deletes either reminder that has not gone out', () => {
    assert.equal(deletionRejection({ ...invitation, scheduleTypeKey: 'advance_reminder' }), null);
    assert.equal(deletionRejection({ ...invitation, scheduleTypeKey: 'event_reminder' }), null);
    assert.ok(
      deletionRejection({ ...invitation, scheduleTypeKey: 'event_reminder', status: 'sent' }),
    );
  });

  it('refuses any other schedule type', () => {
    assert.ok(deletionRejection({ ...invitation, scheduleTypeKey: 'confirmation' }));
    assert.ok(deletionRejection({ ...invitation, scheduleTypeKey: 'post_event' }));
    assert.ok(deletionRejection({ ...invitation, scheduleTypeKey: 'phone_call', kind: 'call' }));
  });

  it('refuses an invitation that went out, by status, send or claim', () => {
    assert.ok(deletionRejection({ ...invitation, status: 'sent' }));
    assert.ok(deletionRejection({ ...invitation, sentAt: '2026-10-01T07:00:00Z' }));
    assert.ok(deletionRejection({ ...invitation, dispatchedAt: '2026-10-01T07:00:00Z' }));
  });
});
