import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { availableFilters, filterGuestRows, isAlreadyAnswered, pageWindow, peopleByOutcome, roundProgress } from './round-results.ts';

type Row = Parameters<typeof filterGuestRows>[0][number];

const row = (over: Partial<Row>): Row => ({
  guestId: over.guestName ?? 'g',
  guestName: 'משפחת לוי',
  outcome: null,
  currentRsvpStatus: 'pending',
  amount: 1,
  notes: null,
  ...over,
});

// ─── roundProgress ────────────────────────────────────────────────────────────

test('progress counts every guest with an outcome as handled', () => {
  const p = roundProgress({ total: 38, awaiting: 14, confirmed: 15, declined: 5, noAnswer: 4, willUpdate: 0 });
  assert.equal(p.handled, 24);
  assert.equal(p.total, 38);
});

test('progress segments are shares of the whole list, not of the handled part', () => {
  const p = roundProgress({ total: 40, awaiting: 20, confirmed: 10, declined: 6, noAnswer: 4, willUpdate: 0 });
  assert.deepEqual(p.segments, [
    { key: 'confirmed', percent: 25 },
    { key: 'declined', percent: 15 },
    { key: 'noAnswer', percent: 10 },
  ]);
});

test('a will-update segment appears only once a call ended that way', () => {
  const p = roundProgress({ total: 10, awaiting: 5, confirmed: 2, declined: 1, noAnswer: 1, willUpdate: 1 });
  assert.deepEqual(p.segments.map((s) => s.key), ['confirmed', 'declined', 'noAnswer', 'willUpdate']);
});

test('an empty round has no segments and nothing handled', () => {
  const p = roundProgress({ total: 0, awaiting: 0, confirmed: 0, declined: 0, noAnswer: 0, willUpdate: 0 });
  assert.deepEqual(p, { handled: 0, total: 0, segments: [] });
});

// ─── peopleByOutcome ──────────────────────────────────────────────────────────

test('people are summed from the headcount on each record, per outcome', () => {
  const people = peopleByOutcome([
    row({ outcome: 'confirmed', amount: 4 }),
    row({ outcome: 'confirmed', amount: 2 }),
    row({ outcome: 'declined', amount: 2 }),
    row({ outcome: 'no_answer', amount: 3 }),
    row({ outcome: 'guest_will_update', amount: 1 }),
    row({ outcome: null, amount: 6 }),
  ]);
  assert.deepEqual(people, { confirmed: 6, declined: 2, noAnswer: 3, willUpdate: 1, awaiting: 6 });
});

test('no rows means no people', () => {
  assert.deepEqual(peopleByOutcome([]), { confirmed: 0, declined: 0, noAnswer: 0, willUpdate: 0, awaiting: 0 });
});

// ─── isAlreadyAnswered ────────────────────────────────────────────────────────

test('a guest who confirmed by WhatsApp before the call is flagged', () => {
  assert.equal(isAlreadyAnswered(row({ outcome: null, currentRsvpStatus: 'confirmed' })), true);
  assert.equal(isAlreadyAnswered(row({ outcome: null, currentRsvpStatus: 'declined' })), true);
});

test('a guest still pending, or called, is not flagged', () => {
  assert.equal(isAlreadyAnswered(row({ outcome: null, currentRsvpStatus: 'pending' })), false);
  assert.equal(isAlreadyAnswered(row({ outcome: 'no_answer', currentRsvpStatus: 'confirmed' })), false);
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
  assert.deepEqual(availableFilters(rows), ['all', 'awaiting', 'confirmed', 'declined', 'noAnswer', 'hasNote']);
});

test('a round with nobody left to call does not offer the waiting filter', () => {
  const done = rows.filter((r) => r.outcome !== null);
  assert.ok(!availableFilters(done).includes('awaiting'));
});

test('will-update is offered only once a call ended that way', () => {
  assert.ok(!availableFilters(rows).includes('willUpdate'));
  assert.ok(availableFilters([...rows, row({ outcome: 'guest_will_update' })]).includes('willUpdate'));
});

// ─── pageWindow ───────────────────────────────────────────────────────────────

test('a pager shows every page when there are few', () => {
  assert.deepEqual(pageWindow(0, 4), [0, 1, 2, 3]);
});

test('a pager window centres on the current page and stays inside the range', () => {
  assert.deepEqual(pageWindow(5, 10), [3, 4, 5, 6, 7]);
  assert.deepEqual(pageWindow(0, 10), [0, 1, 2, 3, 4]);
  assert.deepEqual(pageWindow(9, 10), [5, 6, 7, 8, 9]);
});
