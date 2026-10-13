import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CALL_ROUND_DAYS_AHEAD,
  callRoundDayKey,
  callRoundDays,
  callRoundWindow,
} from './call-round-days';

test('offers today and the next seven days, named for the first three', () => {
  const days = callRoundDays(new Date('2026-10-13T09:00:00Z'));
  assert.equal(days.length, CALL_ROUND_DAYS_AHEAD + 1);
  assert.deepEqual(
    days.map((day) => day.key),
    [
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
    ],
  );
  assert.deepEqual(
    days.slice(0, 3).map((day) => [day.label, day.phrase]),
    [
      ['היום', 'היום'],
      ['מחר', 'מחר'],
      ['מחרתיים', 'מחרתיים'],
    ],
  );
  // The rest carry their own date, on the day they name.
  assert.match(days[3].label, /16\.10/);
  assert.match(days[3].fullLabel, /16/);
  assert.ok(days[3].phrase.startsWith('ב'));
});

test('today turns over at Israel midnight, not UTC midnight', () => {
  // 01:30 on the 14th in Israel, still the 13th in UTC.
  assert.equal(callRoundDays(new Date('2026-10-13T22:30:00Z'))[0].key, '2026-10-14');
  // 23:30 on the 13th in Israel.
  assert.equal(callRoundDays(new Date('2026-10-13T20:30:00Z'))[0].key, '2026-10-13');
});

test('the window runs from Israel midnight to Israel midnight', () => {
  const days = callRoundDays(new Date('2026-10-13T09:00:00Z'));
  assert.deepEqual(callRoundWindow(days), {
    from: '2026-10-12T21:00:00.000Z',
    to: '2026-10-20T21:00:00.000Z',
  });
});

test('the window follows the clock change inside it', () => {
  // Summer time ends on 25 October 2026, so the end is a UTC+2 midnight.
  const days = callRoundDays(new Date('2026-10-20T09:00:00Z'));
  assert.deepEqual(callRoundWindow(days), {
    from: '2026-10-19T21:00:00.000Z',
    to: '2026-10-27T22:00:00.000Z',
  });
});

test('a round belongs to the Israel day of its Due Time', () => {
  // 00:30 on the 15th in Israel.
  assert.equal(callRoundDayKey('2026-10-14T21:30:00Z'), '2026-10-15');
  // 23:59 on the 14th in Israel.
  assert.equal(callRoundDayKey('2026-10-14T20:59:00Z'), '2026-10-14');
});
