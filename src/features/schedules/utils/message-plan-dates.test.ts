import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  messagePlanStartTime,
  reminderProposal,
  reminderProposalDay,
  thankYouDay,
  thankYouDueTime,
} from './message-plan-dates';

// The same cases as the guard in
// supabase/migrations/20261113000000_message_plan.sql. Event dates are stored
// at 00:00 UTC. 2026-12-10 is a Thursday; Israel is UTC+2 in winter, UTC+3 in
// summer (until Sunday 2026-10-25, from Friday 2027-03-26).
const at = (day: string) => `${day}T00:00:00+00:00`;

describe('reminderProposal', () => {
  it('proposes the Event day at 10:00 for an evening Event', () => {
    assert.equal(reminderProposal(at('2026-12-10'), '19:30'), '2026-12-10T08:00:00.000Z');
  });

  it('proposes the day before for an Event starting before 14:00', () => {
    assert.equal(reminderProposal(at('2026-12-10'), '12:00'), '2026-12-09T08:00:00.000Z');
    assert.equal(reminderProposal(at('2026-12-10'), '13:59'), '2026-12-09T08:00:00.000Z');
    assert.equal(reminderProposal(at('2026-12-10'), '9:30'), '2026-12-09T08:00:00.000Z');
  });

  it('keeps the Event day for an Event starting at 14:00 or with no start time', () => {
    assert.equal(reminderProposal(at('2026-12-10'), '14:00'), '2026-12-10T08:00:00.000Z');
    assert.equal(reminderProposal(at('2026-12-10'), null), '2026-12-10T08:00:00.000Z');
    assert.equal(reminderProposal(at('2026-12-10'), 'soon'), '2026-12-10T08:00:00.000Z');
  });

  it('moves a Saturday day-before to Friday for a Sunday morning Event', () => {
    assert.equal(reminderProposalDay(at('2026-12-13'), '11:00'), '2026-12-11');
    assert.equal(reminderProposal(at('2026-12-13'), '11:00'), '2026-12-11T08:00:00.000Z');
  });

  it('moves a Saturday evening Event to the Friday before, since Kululu never proposes Saturday', () => {
    assert.equal(reminderProposal(at('2026-12-12'), '20:00'), '2026-12-11T08:00:00.000Z');
  });

  it('proposes Friday for a Saturday Event whatever its hour', () => {
    // A morning Event's day before is already Friday, so nothing moves twice.
    assert.equal(reminderProposal(at('2026-12-12'), '11:00'), '2026-12-11T08:00:00.000Z');
  });

  it('keeps 10:00 across the daylight-saving change', () => {
    // Sunday 2026-10-25 is the first winter day; the proposed Friday is still summer.
    assert.equal(reminderProposal(at('2026-10-25'), '11:00'), '2026-10-23T07:00:00.000Z');
    assert.equal(reminderProposal(at('2026-10-25'), '19:00'), '2026-10-25T08:00:00.000Z');
  });
});

describe('thankYouDay', () => {
  it('is the day after the Event', () => {
    assert.equal(thankYouDay(at('2026-12-10')), '2026-12-11');
    assert.equal(thankYouDueTime(at('2026-12-10')), '2026-12-11T08:00:00.000Z');
  });

  it('moves to Sunday for a Friday Event', () => {
    assert.equal(thankYouDay(at('2026-12-11')), '2026-12-13');
    assert.equal(thankYouDueTime(at('2026-12-11')), '2026-12-13T08:00:00.000Z');
  });

  it('moves only the hour', () => {
    assert.equal(thankYouDueTime(at('2026-12-10'), '18:30'), '2026-12-11T16:30:00.000Z');
  });

  it('follows daylight saving on both changes', () => {
    // Saturday Event the night before winter time: Sunday is UTC+2.
    assert.equal(thankYouDueTime(at('2026-10-24')), '2026-10-25T08:00:00.000Z');
    // Thursday Event the night before summer time: Friday is UTC+3.
    assert.equal(thankYouDueTime(at('2027-03-25')), '2027-03-26T07:00:00.000Z');
  });
});

describe('messagePlanStartTime', () => {
  it('is the reception time, else the ceremony time', () => {
    assert.equal(messagePlanStartTime('19:30', '20:30'), '19:30');
    assert.equal(messagePlanStartTime('  ', '12:00'), '12:00');
    assert.equal(messagePlanStartTime(null, null), null);
  });
});
