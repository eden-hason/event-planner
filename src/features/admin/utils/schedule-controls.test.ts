import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  conversionRejection,
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
