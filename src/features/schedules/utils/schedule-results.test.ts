import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { availableFilters, buildJourney, filterGuests, formatMoment, guestStatus, lastActivityAt, percent, resultsLiveness, seenState } from './schedule-results.ts';

type Row = Parameters<typeof guestStatus>[0];

const row = (over: Partial<Row>): Row => ({
  guestId: over.guestName ?? 'g',
  guestName: 'נועה לוי',
  steps: [],
  viaFallback: false,
  delivery: 'whatsapp',
  seen: false,
  amount: 1,
  ...over,
});

// ─── guestStatus / seenState ──────────────────────────────────────────────────

test('a WhatsApp guest reads as seen or delivered by the receipt', () => {
  assert.equal(guestStatus(row({ seen: true })), 'seen');
  assert.equal(guestStatus(row({})), 'delivered');
});

test('a guest with no delivery is none, the rest keep their outcome', () => {
  assert.equal(guestStatus(row({ delivery: null })), 'none');
  assert.equal(guestStatus(row({ delivery: 'sms' })), 'sms');
  assert.equal(guestStatus(row({ delivery: 'no_phone' })), 'no_phone');
});

test('an SMS guest is not applicable for seen, never unseen', () => {
  assert.equal(seenState(row({ delivery: 'sms' })), 'na');
  assert.equal(seenState(row({ delivery: 'not_delivered' })), 'na');
  assert.equal(seenState(row({})), 'unseen');
  assert.equal(seenState(row({ seen: true })), 'seen');
});

// ─── filters ──────────────────────────────────────────────────────────────────

test('filters offered follow what the schedule can report', () => {
  assert.deepEqual(availableFilters({ collectsRsvp: true, showSeen: true }), [
    'all',
    'notReached',
    'noResponse',
    'confirmed',
  ]);
  assert.deepEqual(availableFilters({ collectsRsvp: false, showSeen: true }), [
    'all',
    'notReached',
    'unseen',
  ]);
  assert.deepEqual(availableFilters({ collectsRsvp: false, showSeen: false }), [
    'all',
    'notReached',
  ]);
});

test('filtering narrows by state and by a name search together', () => {
  const rows = [
    row({ guestName: 'נועה לוי', response: 'rsvp_confirm' }),
    row({ guestName: 'דוד פרץ', delivery: 'on_its_way' }),
    row({ guestName: 'רון גבאי', delivery: 'not_delivered' }),
    row({ guestName: 'יעל ביטון', delivery: 'sms' }),
  ];
  const names = (
    filter: Parameters<typeof filterGuests>[1]['filter'],
    query = '',
  ) => filterGuests(rows, { filter, query }).map((r: Row) => r.guestName);

  assert.deepEqual(names('notReached'), ['דוד פרץ', 'רון גבאי']);
  assert.deepEqual(names('not_delivered'), ['רון גבאי']);
  assert.deepEqual(names('noResponse'), ['יעל ביטון']);
  assert.deepEqual(names('confirmed'), ['נועה לוי']);
  assert.deepEqual(names('all', ' גבאי '), ['רון גבאי']);
});

test('not seen yet is only reached WhatsApp guests without a receipt', () => {
  const rows = [
    row({ guestName: 'a' }),
    row({ guestName: 'b', seen: true }),
    row({ guestName: 'c', delivery: 'sms' }),
  ];
  assert.deepEqual(
    filterGuests(rows, { filter: 'unseen', query: '' }).map(
      (r: Row) => r.guestName,
    ),
    ['a'],
  );
});

// ─── journey ──────────────────────────────────────────────────────────────────

test('a journey across WhatsApp and an SMS Fallback reads in time order', () => {
  const journey = buildJourney(
    row({
      delivery: 'sms',
      viaFallback: true,
      response: 'rsvp_confirm',
      respondedAt: '2026-09-21T08:53:00Z',
      guestCount: 2,
      steps: [
        {
          channel: 'whatsapp',
          fallback: false,
          sentAt: '2026-09-20T15:00:00Z',
          failedAt: '2026-09-20T15:04:00Z',
        },
        { channel: 'sms', fallback: true, sentAt: '2026-09-21T08:30:00Z' },
      ],
    }),
  );
  assert.deepEqual(
    journey.map(
      (s: { kind: string; channel?: string }) =>
        `${s.kind}${s.channel ? `:${s.channel}` : ''}`,
    ),
    [
      'sent:whatsapp',
      'not_delivered:whatsapp',
      'sent:sms',
      'confirmed',
    ],
  );
  assert.equal(journey[2].fallback, true);
});

test('a guest on the way ends in an open step, and no phone is one step', () => {
  const onWay = buildJourney(
    row({
      delivery: 'on_its_way',
      steps: [
        {
          channel: 'whatsapp',
          fallback: false,
          sentAt: '2026-09-20T15:00:00Z',
        },
      ],
    }),
  );
  assert.deepEqual(
    onWay.map((s: { kind: string }) => s.kind),
    ['sent', 'on_its_way'],
  );
  assert.deepEqual(
    buildJourney(row({ delivery: 'no_phone' })).map(
      (s: { kind: string }) => s.kind,
    ),
    ['no_phone'],
  );
});

test('SMS never claims delivered or seen', () => {
  const journey = buildJourney(
    row({
      delivery: 'sms',
      steps: [
        {
          channel: 'sms',
          fallback: false,
          sentAt: '2026-09-20T15:00:00Z',
          deliveredAt: '2026-09-20T15:01:00Z',
        },
      ],
    }),
  );
  assert.deepEqual(
    journey.map((s: { kind: string }) => s.kind),
    ['sent'],
  );
});

test('a delivery from before attempts were recorded still shows its send', () => {
  const journey = buildJourney(
    row({ delivery: 'sms', sentAt: '2026-09-20T15:00:00Z' }),
  );
  assert.deepEqual(journey, [
    { kind: 'sent', at: '2026-09-20T15:00:00Z', channel: 'sms' },
  ]);
});

// ─── liveness, percent, time ──────────────────────────────────────────────────

test('results stay live while anything is on its way or inside the window', () => {
  const now = new Date('2026-09-21T12:00:00Z');
  assert.equal(
    resultsLiveness({
      sentAt: '2026-09-01T12:00:00Z',
      onItsWay: 1,
      collectsRsvp: false,
      now,
    }),
    'live',
  );
  assert.equal(
    resultsLiveness({
      sentAt: '2026-09-19T13:00:00Z',
      onItsWay: 0,
      collectsRsvp: true,
      now,
    }),
    'live',
  );
  assert.equal(
    resultsLiveness({
      sentAt: '2026-09-19T13:00:00Z',
      onItsWay: 0,
      collectsRsvp: false,
      now,
    }),
    'settled',
  );
});

test('percent rounds and never divides by zero', () => {
  assert.equal(percent(41, 227), 18);
  assert.equal(percent(3, 0), 0);
});

test('the latest activity is the newest timestamp on the row', () => {
  assert.equal(
    lastActivityAt(
      row({
        sentAt: '2026-09-20T15:00:00Z',
        steps: [
          {
            channel: 'whatsapp',
            fallback: false,
            readAt: '2026-09-20T17:00:00Z',
          },
        ],
        respondedAt: '2026-09-20T16:00:00Z',
      }),
    ),
    '2026-09-20T17:00:00Z',
  );
  assert.equal(lastActivityAt(row({})), undefined);
});

test('moments read as time today, yesterday with time, then a date', () => {
  const now = new Date('2026-09-21T12:00:00Z'); // 15:00 in Israel
  assert.equal(
    formatMoment('2026-09-21T06:05:00Z', { now, locale: 'en' }),
    '09:05',
  );
  assert.equal(
    formatMoment('2026-09-20T18:14:00Z', { now, locale: 'en' }),
    'yesterday 21:14',
  );
  assert.equal(
    formatMoment('2026-09-18T18:14:00Z', { now, locale: 'en' }),
    '9/18',
  );
});
