import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { availableFilters, filterGuestRows, guestCallStatus, isAlreadyAnswered, peopleByOutcome, roundProgress } from './round-results.ts';

type Row = Parameters<typeof filterGuestRows>[0][number];

const row = (over: Partial<Row>): Row => ({
  guestId: over.guestName ?? 'g',
  guestName: 'משפחת לוי',
  phone: null,
  outcome: null,
  currentRsvpStatus: 'pending',
  amount: 1,
  notes: null,
  ...over,
});

// ─── roundProgress ────────────────────────────────────────────────────────────

test('progress counts every guest with an outcome as handled', () => {
  const p = roundProgress({ total: 38, awaiting: 14, confirmed: 15, declined: 5, noAnswer: 4 });
  assert.equal(p.handled, 24);
  assert.equal(p.total, 38);
});

test('progress segments are shares of the whole list, not of the handled part', () => {
  const p = roundProgress({ total: 40, awaiting: 20, confirmed: 10, declined: 6, noAnswer: 4 });
  assert.deepEqual(p.segments, [
    { key: 'confirmed', percent: 25 },
    { key: 'declined', percent: 15 },
    { key: 'noAnswer', percent: 10 },
  ]);
});

test('an empty round has no segments and nothing handled', () => {
  const p = roundProgress({ total: 0, awaiting: 0, confirmed: 0, declined: 0, noAnswer: 0 });
  assert.deepEqual(p, { handled: 0, total: 0, segments: [] });
});

// ─── peopleByOutcome ──────────────────────────────────────────────────────────

test('people are summed from the headcount on each record, per outcome', () => {
  const people = peopleByOutcome([
    row({ outcome: 'confirmed', amount: 4 }),
    row({ outcome: 'confirmed', amount: 2 }),
    row({ outcome: 'declined', amount: 2 }),
    row({ outcome: 'no_answer', amount: 3 }),
    row({ outcome: null, amount: 6 }),
  ]);
  assert.deepEqual(people, { confirmed: 6, declined: 2, noAnswer: 3, awaiting: 6 });
});

test('no rows means no people', () => {
  assert.deepEqual(peopleByOutcome([]), { confirmed: 0, declined: 0, noAnswer: 0, awaiting: 0 });
});

// ─── isAlreadyAnswered ────────────────────────────────────────────────────────

test('a guest who confirmed by WhatsApp before the call is flagged', () => {
  assert.equal(isAlreadyAnswered(row({ outcome: null, currentRsvpStatus: 'confirmed' })), true);
  assert.equal(isAlreadyAnswered(row({ outcome: null, currentRsvpStatus: 'declined' })), true);
});

test('a guest still pending, or called, is not flagged', () => {
  assert.equal(isAlreadyAnswered(row({ outcome: null, currentRsvpStatus: 'pending' })), false);
  assert.equal(
    isAlreadyAnswered(row({ outcome: 'no_answer', currentRsvpStatus: 'confirmed' })),
    false,
  );
});

// ─── guestCallStatus ──────────────────────────────────────────────────────────

test('a call that matches the RSVP leads with the call and explains nothing', () => {
  assert.deepEqual(guestCallStatus(row({ outcome: 'confirmed', currentRsvpStatus: 'confirmed' })), {
    kind: 'confirmed',
    now: null,
    explain: null,
  });
  assert.deepEqual(guestCallStatus(row({ outcome: 'no_answer', currentRsvpStatus: 'pending' })), {
    kind: 'noAnswer',
    now: null,
    explain: null,
  });
});

test('no outcome splits into waiting for the call and answered first', () => {
  assert.equal(
    guestCallStatus(row({ outcome: null, currentRsvpStatus: 'pending' })).kind,
    'notCalled',
  );
  assert.deepEqual(guestCallStatus(row({ outcome: null, currentRsvpStatus: 'declined' })), {
    kind: 'answeredFirst',
    now: null,
    explain: 'answeredFirst',
  });
});

test('an RSVP that moved after an unanswered call shows as the answer now', () => {
  assert.deepEqual(guestCallStatus(row({ outcome: 'no_answer', currentRsvpStatus: 'confirmed' })), {
    kind: 'noAnswer',
    now: 'confirmed',
    explain: 'answeredSince',
  });
});

test('an answer changed after the call shows as the answer now', () => {
  assert.deepEqual(guestCallStatus(row({ outcome: 'confirmed', currentRsvpStatus: 'declined' })), {
    kind: 'confirmed',
    now: 'declined',
    explain: 'changed',
  });
});

// ─── filterGuestRows ──────────────────────────────────────────────────────────

const rows = [
  row({ guestName: 'משפחת לוי', outcome: 'confirmed', notes: 'עם שני ילדים' }),
  row({ guestName: 'אורי כהן', outcome: 'declined' }),
  row({ guestName: 'תמר בן דוד', outcome: 'no_answer' }),
  row({ guestName: 'נועה גולן', outcome: null }),
];

test('the all filter with no query returns everyone', () => {
  assert.equal(filterGuestRows(rows, { filter: 'all', query: '' }).length, 4);
});

test('an outcome filter keeps only that outcome', () => {
  assert.deepEqual(
    filterGuestRows(rows, { filter: 'confirmed', query: '' }).map((r) => r.guestName),
    ['משפחת לוי'],
  );
  assert.deepEqual(
    filterGuestRows(rows, { filter: 'awaiting', query: '' }).map((r) => r.guestName),
    ['נועה גולן'],
  );
});

test('the remarks filter keeps only guests the team left a note on', () => {
  assert.deepEqual(
    filterGuestRows(rows, { filter: 'hasNote', query: '' }).map((r) => r.guestName),
    ['משפחת לוי'],
  );
});

test('the search matches part of a name, ignoring case and surrounding space', () => {
  assert.deepEqual(
    filterGuestRows(rows, { filter: 'all', query: '  כהן ' }).map((r) => r.guestName),
    ['אורי כהן'],
  );
  assert.deepEqual(
    filterGuestRows([row({ guestName: 'Dana Levi' })], { filter: 'all', query: 'LEVI' }).length,
    1,
  );
});

test('search and filter narrow together', () => {
  assert.equal(filterGuestRows(rows, { filter: 'declined', query: 'לוי' }).length, 0);
});

// ─── availableFilters ─────────────────────────────────────────────────────────

test('a filter is offered only when something would match it', () => {
  assert.deepEqual(availableFilters(rows), [
    'all',
    'awaiting',
    'confirmed',
    'declined',
    'noAnswer',
    'hasNote',
  ]);
});

test('a round with nobody left to call does not offer the waiting filter', () => {
  const done = rows.filter((r) => r.outcome !== null);
  assert.ok(!availableFilters(done).includes('awaiting'));
});
