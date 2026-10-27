import assert from 'node:assert/strict';
import { test } from 'node:test';
import { yesterdayEventDateRange } from './follow-up';

test('yesterday covers exactly the previous calendar day', () => {
  assert.deepEqual(yesterdayEventDateRange(new Date('2026-10-27T09:00:00Z')), {
    start: '2026-10-26T00:00:00.000Z',
    end: '2026-10-27T00:00:00.000Z',
  });
});

test('the day turns over at Israel midnight, not UTC midnight', () => {
  // 22:30 UTC on 27 Oct is already 00:30 on 28 Oct in Israel (UTC+2 by then).
  assert.deepEqual(yesterdayEventDateRange(new Date('2026-10-27T22:30:00Z')), {
    start: '2026-10-27T00:00:00.000Z',
    end: '2026-10-28T00:00:00.000Z',
  });
  // 21:30 UTC on 1 Aug is 00:30 on 2 Aug in summer time (UTC+3).
  assert.deepEqual(yesterdayEventDateRange(new Date('2026-08-01T21:30:00Z')), {
    start: '2026-08-01T00:00:00.000Z',
    end: '2026-08-02T00:00:00.000Z',
  });
});

test('crosses month and year boundaries', () => {
  assert.deepEqual(yesterdayEventDateRange(new Date('2027-01-01T10:00:00Z')), {
    start: '2026-12-31T00:00:00.000Z',
    end: '2027-01-01T00:00:00.000Z',
  });
});
