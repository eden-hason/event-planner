import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { availableFilters, buildJourney, filterGuests, formatAgo, formatMoment, guestTableHiddenColumns, guestTableTier, lastActivityAt, messageState, percent, resultsLiveness, rsvpAskOf, rsvpState } from './schedule-results.ts';

type Row = Parameters<typeof messageState>[0];

const row = (over: Partial<Row>): Row => ({
  guestId: over.guestName ?? 'g',
  guestName: 'נועה לוי',
  steps: [],
  delivery: 'whatsapp',
  seen: false,
  amount: 1,
  ...over,
});

// ─── messageState / rsvpState ─────────────────────────────────────────────────

const wa = { channel: 'whatsapp' as const, fallback: null, sentAt: '2026-09-21T10:00:00Z' };
const sms = { channel: 'sms' as const, fallback: 'failed' as const, sentAt: '2026-09-21T10:10:00Z' };

test('a message reads as its ticks: received, read', () => {
  assert.equal(messageState(row({})), 'received');
  assert.equal(messageState(row({ seen: true })), 'read');
  assert.equal(messageState(row({ delivery: 'sms' })), 'received');
});

test('on its way is sent once accepted, and pending before any attempt', () => {
  assert.equal(messageState(row({ delivery: 'on_its_way', steps: [wa] })), 'sent');
  assert.equal(messageState(row({ delivery: 'on_its_way', steps: [] })), 'pending');
});

test('an SMS on the way is sent once accepted, pending while the Fallback is still to go', () => {
  const failedWa = { ...wa, failedAt: '2026-09-21T10:01:00Z' };
  assert.equal(messageState(row({ delivery: 'sms_on_its_way', steps: [failedWa, sms] })), 'sent');
  assert.equal(messageState(row({ delivery: 'sms_on_its_way', steps: [failedWa] })), 'pending');
});

test('a failure, and the records nothing was sent to, keep their reason', () => {
  assert.equal(messageState(row({ delivery: 'not_delivered' })), 'failed');
  assert.equal(messageState(row({ delivery: 'no_phone' })), 'no_phone');
  assert.equal(messageState(row({ delivery: 'outside_package' })), 'outside_package');
  assert.equal(messageState(row({ delivery: null })), 'none');
});

test('the answer, and no answer told apart from not being asked', () => {
  assert.equal(rsvpState(row({ response: 'rsvp_confirm' })), 'confirmed');
  assert.equal(rsvpState(row({ response: 'rsvp_decline' })), 'declined');
  assert.equal(rsvpState(row({})), 'pending');
  assert.equal(rsvpState(row({ notAsked: true })), 'not_asked');
  // An answer counts even where the Schedule did not ask
  assert.equal(rsvpState(row({ notAsked: true, response: 'rsvp_confirm' })), 'confirmed');
});

// ─── guestTableTier ───────────────────────────────────────────────────────────

test('the table folds at fixed widths, never by layout', () => {
  assert.equal(guestTableTier(1215), 'full');
  assert.equal(guestTableTier(672), 'full');
  assert.equal(guestTableTier(671), 'medium');
  assert.equal(guestTableTier(512), 'medium');
  assert.equal(guestTableTier(511), 'compact');
  assert.equal(guestTableTier(448), 'compact');
  assert.equal(guestTableTier(447), 'tight');
  assert.equal(guestTableTier(0), 'tight');
});

test('each tier folds the columns of the one above it, and one more', () => {
  assert.deepEqual(guestTableHiddenColumns('full', true), {});
  assert.deepEqual(guestTableHiddenColumns('medium', true), { phone: false });
  assert.deepEqual(guestTableHiddenColumns('compact', true), { phone: false, lastUpdate: false });
  assert.deepEqual(guestTableHiddenColumns('tight', true), { phone: false, lastUpdate: false, message: false });
  // With no answer column, the message stays: it is all the row has to say
  assert.deepEqual(guestTableHiddenColumns('tight', false), { phone: false, lastUpdate: false });
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
      response: 'rsvp_confirm',
      respondedAt: '2026-09-21T08:53:00Z',
      guestCount: 2,
      steps: [
        {
          channel: 'whatsapp',
          fallback: null,
          sentAt: '2026-09-20T15:00:00Z',
          failedAt: '2026-09-20T15:04:00Z',
        },
        { channel: 'sms', fallback: 'failed', sentAt: '2026-09-21T08:30:00Z' },
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
  assert.equal(journey[2].fallback, 'failed');
});

test('a guest on the way ends in an open step, and no phone is one step', () => {
  const onWay = buildJourney(
    row({
      delivery: 'on_its_way',
      steps: [
        {
          channel: 'whatsapp',
          fallback: null,
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

test('a guest an SMS Fallback is coming for ends in an open SMS step', () => {
  const journey = buildJourney(
    row({
      delivery: 'sms_on_its_way',
      steps: [
        {
          channel: 'whatsapp',
          fallback: null,
          sentAt: '2026-10-08T16:13:00Z',
          failedAt: '2026-10-08T16:13:45Z',
        },
      ],
    }),
  );
  assert.deepEqual(
    journey.map(
      (s: { kind: string; channel?: string }) =>
        `${s.kind}${s.channel ? `:${s.channel}` : ''}`,
    ),
    ['sent:whatsapp', 'not_delivered:whatsapp', 'sms_on_its_way:sms'],
  );
});

test('a Hand Delivery follows the failures as one step, and is received but never read', () => {
  const handed = row({
    delivery: 'whatsapp',
    steps: [
      { channel: 'whatsapp', fallback: null, sentAt: '2026-11-01T10:00:00Z', failedAt: '2026-11-01T10:00:30Z' },
      { channel: 'sms', fallback: 'failed', sentAt: '2026-11-01T12:00:00Z', failedAt: '2026-11-01T12:05:00Z' },
      {
        channel: 'whatsapp',
        fallback: null,
        byHand: true,
        sentAt: '2026-11-02T09:00:00Z',
        deliveredAt: '2026-11-02T09:00:00Z',
      },
    ],
  });
  assert.deepEqual(
    buildJourney(handed).map((s: { kind: string; channel?: string }) => `${s.kind}${s.channel ? `:${s.channel}` : ''}`),
    ['sent:whatsapp', 'not_delivered:whatsapp', 'sent:sms', 'not_delivered:sms', 'delivered_by_hand:whatsapp'],
  );
  assert.equal(messageState(handed), 'received');
});

test('an SMS on its way is not reached yet', () => {
  const rows = [
    row({ guestName: 'a', delivery: 'sms_on_its_way' }),
    row({ guestName: 'b', delivery: 'not_delivered' }),
  ];
  const names = (filter: Parameters<typeof filterGuests>[1]['filter']) =>
    filterGuests(rows, { filter, query: '' }).map((r: Row) => r.guestName);
  assert.deepEqual(names('notReached'), ['a', 'b']);
  // A Fallback still to go out: nothing accepted yet
  assert.equal(messageState(rows[0]), 'pending');
});

test('a confirmed SMS shows as delivered, and never as seen', () => {
  const journey = buildJourney(
    row({
      delivery: 'sms',
      steps: [
        {
          channel: 'sms',
          fallback: null,
          sentAt: '2026-09-20T15:00:00Z',
          deliveredAt: '2026-09-20T15:01:00Z',
          readAt: '2026-09-20T15:02:00Z',
        },
      ],
    }),
  );
  assert.deepEqual(
    journey.map((s: { kind: string; channel?: string }) => `${s.kind}:${s.channel}`),
    ['sent:sms', 'delivered:sms'],
  );
});

test('an SMS the provider has not confirmed ends in an open SMS step', () => {
  const journey = buildJourney(
    row({
      delivery: 'sms_on_its_way',
      steps: [{ channel: 'sms', fallback: null, sentAt: '2026-10-14T10:00:00Z' }],
    }),
  );
  assert.deepEqual(
    journey.map((s: { kind: string; channel?: string }) => `${s.kind}:${s.channel}`),
    ['sent:sms', 'sms_on_its_way:sms'],
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
            fallback: null,
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

test('ago reads in minutes, then hours, then days, and never in the future', () => {
  const now = new Date('2026-09-21T12:00:00Z');
  const ago = (iso: string) => formatAgo(iso, { now, locale: 'en' });
  assert.equal(ago('2026-09-21T11:55:00Z'), '5 minutes ago');
  assert.equal(ago('2026-09-21T09:00:00Z'), '3 hours ago');
  assert.equal(ago('2026-09-20T13:00:00Z'), '23 hours ago');
  assert.equal(ago('2026-09-18T12:00:00Z'), '3 days ago');
  assert.equal(ago('2026-09-21T11:59:50Z'), 'now');
  assert.equal(ago('2026-09-21T12:03:00Z'), 'now');
});

test('ago in Hebrew never repeats the count in brackets', () => {
  const now = new Date('2026-09-21T12:00:00Z');
  const he = (iso: string) => formatAgo(iso, { now, locale: 'he' });
  assert.equal(he('2026-09-21T11:59:00Z'), 'לפני דקה');
  assert.equal(he('2026-09-21T11:00:00Z'), 'לפני שעה');
  assert.equal(he('2026-09-21T10:00:00Z'), 'לפני שעתיים');
  assert.equal(he('2026-09-21T09:00:00Z'), 'לפני 3 שעות');
  assert.equal(he('2026-09-21T11:55:00Z'), 'לפני 5 דקות');
  for (const iso of ['2026-09-21T11:59:00Z', '2026-09-21T11:00:00Z', '2026-09-21T10:00:00Z', '2026-09-19T12:00:00Z']) {
    assert.doesNotMatch(he(iso), /\(\d+\)/);
  }
});

// ─── outside the Record Package (ADR 0027) ────────────────────────────────────

test('a record outside the package keeps its own status and journey', () => {
  const outside = row({ delivery: 'outside_package' });
  assert.equal(messageState(outside), 'outside_package');
  assert.deepEqual(
    buildJourney(outside).map((s: { kind: string }) => s.kind),
    ['outside_package'],
  );
});

test('records outside the package count as not reached', () => {
  const rows = [
    row({ guestName: 'נועה לוי' }),
    row({ guestName: 'דוד פרץ', delivery: 'outside_package' }),
    row({ guestName: 'רון גבאי', delivery: 'no_phone' }),
  ];
  const names = (filter: Parameters<typeof filterGuests>[1]['filter']) =>
    filterGuests(rows, { filter, query: '' }).map((r: Row) => r.guestName);

  assert.deepEqual(names('notReached'), ['דוד פרץ', 'רון גבאי']);
});

// ─── The RSVP ask (ADR 0051) ──────────────────────────────────────────────────

test('a Confirmation asks everyone, an Advance Reminder only the pending, the rest no one', () => {
  assert.equal(rsvpAskOf('confirmation', false), 'everyone');
  assert.equal(rsvpAskOf('advance_reminder', true), 'pending');
  assert.equal(rsvpAskOf('event_reminder', false), 'none');
});

test('a Guest the Schedule did not ask is never waiting on an answer', () => {
  const rows = [
    row({ guestName: 'asked' }),
    row({ guestName: 'not asked', notAsked: true }),
    row({ guestName: 'answered', response: 'rsvp_confirm' }),
  ];
  assert.deepEqual(
    filterGuests(rows, { filter: 'noResponse', query: '' }).map((r: Row) => r.guestName),
    ['asked'],
  );
});

