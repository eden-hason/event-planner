import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isDue, isTooLate, postEventDueAt } from './due';

describe('postEventDueAt', () => {
  it('is 18:00 Israel the day after the Event', () => {
    // Tuesday 2026-11-10 -> Wednesday 2026-11-11, 18:00 IST (UTC+2).
    assert.equal(postEventDueAt('2026-11-10T00:00:00+00:00'), '2026-11-11T16:00:00.000Z');
  });

  it('follows summer time', () => {
    // Wednesday 2026-07-01 -> Thursday 2026-07-02, 18:00 IDT (UTC+3).
    assert.equal(postEventDueAt('2026-07-01T00:00:00+00:00'), '2026-07-02T15:00:00.000Z');
  });

  it('sends at 12:00 on Friday for a Thursday Event', () => {
    // Thursday 2026-11-12 -> Friday 13th, 12:00 IST (UTC+2), before Shabbat.
    assert.equal(postEventDueAt('2026-11-12T00:00:00+00:00'), '2026-11-13T10:00:00.000Z');
  });

  it('sends at 12:00 on Friday in summer too', () => {
    // Thursday 2026-07-02 -> Friday 3rd, 12:00 IDT (UTC+3).
    assert.equal(postEventDueAt('2026-07-02T00:00:00+00:00'), '2026-07-03T09:00:00.000Z');
  });

  it('skips a Saturday to Sunday', () => {
    // Friday 2026-11-13 -> Saturday 14th is skipped -> Sunday 15th.
    assert.equal(postEventDueAt('2026-11-13T00:00:00+00:00'), '2026-11-15T16:00:00.000Z');
  });

  it('sends on Sunday for a Saturday Event', () => {
    assert.equal(postEventDueAt('2026-11-14T00:00:00+00:00'), '2026-11-15T16:00:00.000Z');
  });

  it('crosses a month end', () => {
    // Wednesday 2026-09-30 -> Thursday 2026-10-01, 18:00 IDT (UTC+3).
    assert.equal(postEventDueAt('2026-09-30T00:00:00+00:00'), '2026-10-01T15:00:00.000Z');
  });

  it('crosses a year end into a Friday', () => {
    // Thursday 2026-12-31 -> Friday 2027-01-01, 12:00 IST (UTC+2).
    assert.equal(postEventDueAt('2026-12-31T00:00:00+00:00'), '2027-01-01T10:00:00.000Z');
  });

  it('is null without a date', () => {
    assert.equal(postEventDueAt(null), null);
    assert.equal(postEventDueAt('not a date'), null);
  });
});

describe('isDue and isTooLate', () => {
  const due = '2026-11-11T16:00:00.000Z';

  it('is not due before the time', () => {
    assert.equal(isDue(due, new Date('2026-11-11T15:59:00Z')), false);
    assert.equal(isDue(due, new Date('2026-11-11T16:00:00Z')), true);
  });

  it('allows up to 48 hours late', () => {
    assert.equal(isTooLate(due, new Date('2026-11-13T16:00:00Z')), false);
    assert.equal(isTooLate(due, new Date('2026-11-13T16:01:00Z')), true);
  });
});
