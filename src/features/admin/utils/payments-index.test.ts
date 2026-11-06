import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PaymentIndexRow, PaymentsIndexFilters } from '../types';
import {
  amountLabel,
  DEFAULT_PAYMENTS_INDEX_FILTERS,
  filterPaymentRows,
  hasPaymentsIndexFilters,
  parsePaymentsIndexParams,
  paymentMonth,
  paymentsIndexHref,
  paymentYears,
  periodLabel,
  sortPaymentRows,
  sumPaymentAmounts,
  yearPatch,
} from './payments-index';

function filters(patch: Partial<PaymentsIndexFilters> = {}): PaymentsIndexFilters {
  return { ...DEFAULT_PAYMENTS_INDEX_FILTERS, ...patch };
}

function row(patch: Partial<PaymentIndexRow> & { id: string }): PaymentIndexRow {
  return {
    eventId: 'event-1',
    eventTitle: 'החתונה',
    ownerName: 'דנה כהן',
    ownerEmail: 'dana@example.com',
    amount: 1000,
    method: 'bit',
    kind: 'plan',
    reference: null,
    occurredAt: '2026-10-05T10:00:00Z',
    ...patch,
  };
}

const ROWS = [
  row({ id: 'a', ownerName: 'דנה כהן', amount: 1200, occurredAt: '2026-10-05T10:00:00Z' }),
  row({ id: 'b', ownerName: 'יוסי לוי', ownerEmail: 'yossi@example.com', amount: 300, occurredAt: '2026-10-20T10:00:00Z' }),
  row({ id: 'c', ownerName: 'דנה כהן', amount: 450, occurredAt: '2026-09-12T10:00:00Z' }),
  // 22:30 UTC on 30 Sep is already 1 Oct in Israel.
  row({ id: 'd', ownerName: 'מיכל אברהם', ownerEmail: 'michal@example.com', amount: 800, occurredAt: '2026-09-30T22:30:00Z' }),
];

const ids = (rows: PaymentIndexRow[]) => rows.map((r) => r.id);

test('reads the URL and drops what is malformed', () => {
  assert.deepEqual(parsePaymentsIndexParams({}), DEFAULT_PAYMENTS_INDEX_FILTERS);
  assert.deepEqual(
    parsePaymentsIndexParams({ q: 'דנה', month: '2026-10', min: '100', max: '1,500', sort: 'amount', dir: 'asc', page: '2' }),
    { q: 'דנה', year: '2026', month: '2026-10', minAmount: 100, maxAmount: 1500, sort: 'amount', dir: 'asc', page: 2 },
  );
  const bad = parsePaymentsIndexParams({ month: '2026-13', min: '-5', max: 'abc', sort: 'owner', page: '0' });
  assert.equal(bad.month, null);
  assert.equal(bad.minAmount, null);
  assert.equal(bad.maxAmount, null);
  assert.equal(bad.sort, 'date');
  assert.equal(bad.page, 1);
});

test('a year stands alone, and a month always brings its own year', () => {
  assert.deepEqual(
    [parsePaymentsIndexParams({ year: '2025' }).year, parsePaymentsIndexParams({ year: '2025' }).month],
    ['2025', null],
  );
  // A month overrules a year that disagrees with it.
  const both = parsePaymentsIndexParams({ year: '2025', month: '2026-10' });
  assert.equal(both.year, '2026');
  assert.equal(both.month, '2026-10');
  assert.equal(parsePaymentsIndexParams({ year: '26' }).year, null);
  assert.equal(parsePaymentsIndexParams({ year: 'abcd' }).year, null);
});

test('the URL carries the month, or the year when there is no month', () => {
  assert.equal(paymentsIndexHref(filters({ year: '2025' })), '/admin/payments?year=2025');
  assert.equal(paymentsIndexHref(filters({ year: '2026', month: '2026-10' })), '/admin/payments?month=2026-10');
  const href = paymentsIndexHref(filters({ year: '2025', page: 2 }));
  const params = Object.fromEntries(new URL(href, 'https://x').searchParams);
  assert.deepEqual(parsePaymentsIndexParams(params), filters({ year: '2025' }));
});

test('the year filter keeps the whole Israel year', () => {
  const rows = [
    ...ROWS,
    row({ id: 'e', amount: 200, occurredAt: '2025-06-01T10:00:00Z' }),
    // 22:30 UTC on 31 Dec 2025 is already 2026 in Israel.
    row({ id: 'f', amount: 350, occurredAt: '2025-12-31T22:30:00Z' }),
  ];
  assert.deepEqual(ids(filterPaymentRows(rows, filters({ year: '2026' }))), ['a', 'b', 'c', 'd', 'f']);
  assert.deepEqual(ids(filterPaymentRows(rows, filters({ year: '2025' }))), ['e']);
  assert.deepEqual(ids(filterPaymentRows(rows, filters({ year: '2024' }))), []);
  assert.deepEqual(ids(filterPaymentRows(rows, filters({ year: '2026', month: '2026-09' }))), ['c']);
  assert.equal(hasPaymentsIndexFilters(filters({ year: '2026' })), true);
});

test('the years on offer are those with payments, plus this year, newest first', () => {
  const now = new Date('2026-11-06T10:00:00Z');
  assert.deepEqual(paymentYears([], now), ['2026']);
  assert.deepEqual(
    paymentYears([{ occurredAt: '2024-03-01T10:00:00Z' }, { occurredAt: '2025-12-31T22:30:00Z' }, { occurredAt: '2024-05-01T10:00:00Z' }], now),
    ['2026', '2024'],
  );
});

test('picking another year keeps the month when it has already happened there', () => {
  const now = new Date('2026-11-06T10:00:00Z');
  assert.deepEqual(yearPatch({ month: '2026-10' }, '2025', now), { year: '2025', month: '2025-10' });
  assert.deepEqual(yearPatch({ month: '2025-12' }, '2026', now), { year: '2026', month: null });
  assert.deepEqual(yearPatch({ month: null }, '2025', now), { year: '2025', month: null });
  assert.deepEqual(yearPatch({ month: '2026-10' }, null, now), { year: null, month: null });
});

test('the period label names the month or the year', () => {
  assert.equal(periodLabel({ year: null, month: null }), null);
  assert.equal(periodLabel({ year: '2026', month: null }), 'שנת 2026');
  assert.match(periodLabel({ year: '2026', month: '2026-10' })!, /אוקטובר.*2026/);
});

test('the total adds up every amount without floating point drift', () => {
  assert.equal(sumPaymentAmounts([]), 0);
  assert.equal(sumPaymentAmounts([{ amount: 0.1 }, { amount: 0.2 }]), 0.3);
  assert.equal(sumPaymentAmounts(ROWS), 2750);
});

test('amount bounds entered the wrong way round are swapped', () => {
  const parsed = parsePaymentsIndexParams({ min: '900', max: '100' });
  assert.equal(parsed.minAmount, 100);
  assert.equal(parsed.maxAmount, 900);
});

test('the URL round-trips and any change but the page goes back to page 1', () => {
  const state = filters({ q: 'דנה', year: '2026', month: '2026-10', minAmount: 100, maxAmount: null, page: 3 });
  const href = paymentsIndexHref(state, { maxAmount: 2000 });
  assert.equal(href, `/admin/payments?q=${encodeURIComponent('דנה')}&month=2026-10&min=100&max=2000`);
  const params = Object.fromEntries(new URL(href, 'https://x').searchParams);
  assert.deepEqual(parsePaymentsIndexParams(params), { ...state, maxAmount: 2000, page: 1 });
  assert.equal(paymentsIndexHref(state, { page: 4 }).endsWith('&page=4'), true);
  assert.equal(paymentsIndexHref(filters()), '/admin/payments');
});

test('only search and filters count as filtering, not sort or page', () => {
  assert.equal(hasPaymentsIndexFilters(filters({ sort: 'amount', page: 3 })), false);
  assert.equal(hasPaymentsIndexFilters(filters({ q: '  ' })), false);
  assert.equal(hasPaymentsIndexFilters(filters({ month: '2026-10' })), true);
  assert.equal(hasPaymentsIndexFilters(filters({ minAmount: 0 })), true);
});

test('a payment belongs to the month it was made in, in Israel', () => {
  assert.equal(paymentMonth('2026-09-30T22:30:00Z'), '2026-10');
  assert.equal(paymentMonth('2026-09-30T20:30:00Z'), '2026-09');
});

test('the month filter keeps only that month', () => {
  assert.deepEqual(ids(filterPaymentRows(ROWS, filters({ month: '2026-10' }))), ['a', 'b', 'd']);
  assert.deepEqual(ids(filterPaymentRows(ROWS, filters({ month: '2026-09' }))), ['c']);
});

test('the amount filter is inclusive at both ends, and either end may be open', () => {
  assert.deepEqual(ids(filterPaymentRows(ROWS, filters({ minAmount: 450, maxAmount: 1200 }))), ['a', 'c', 'd']);
  assert.deepEqual(ids(filterPaymentRows(ROWS, filters({ minAmount: 801 }))), ['a']);
  assert.deepEqual(ids(filterPaymentRows(ROWS, filters({ maxAmount: 450 }))), ['b', 'c']);
});

test('search matches the customer name or email, ignoring case and spaces', () => {
  assert.deepEqual(ids(filterPaymentRows(ROWS, filters({ q: 'דנה' }))), ['a', 'c']);
  assert.deepEqual(ids(filterPaymentRows(ROWS, filters({ q: 'דנה  כהן' }))), ['a', 'c']);
  assert.deepEqual(ids(filterPaymentRows(ROWS, filters({ q: 'YOSSI' }))), ['b']);
});

test('filters combine', () => {
  assert.deepEqual(ids(filterPaymentRows(ROWS, filters({ q: 'דנה', month: '2026-10' }))), ['a']);
  assert.deepEqual(ids(filterPaymentRows(ROWS, filters({ month: '2026-10', maxAmount: 900 }))), ['b', 'd']);
  assert.deepEqual(ids(filterPaymentRows(ROWS, filters({ q: 'דנה', month: '2026-10', maxAmount: 900 }))), []);
});

test('sorts newest first by default, or by amount', () => {
  assert.deepEqual(ids(sortPaymentRows(ROWS, 'date', 'desc')), ['b', 'a', 'd', 'c']);
  assert.deepEqual(ids(sortPaymentRows(ROWS, 'date', 'asc')), ['c', 'd', 'a', 'b']);
  assert.deepEqual(ids(sortPaymentRows(ROWS, 'amount', 'desc')), ['a', 'd', 'c', 'b']);
  assert.deepEqual(ids(sortPaymentRows(ROWS, 'amount', 'asc')), ['b', 'c', 'd', 'a']);
});

test('the amount label says which ends are set', () => {
  assert.equal(amountLabel({ minAmount: null, maxAmount: null }), null);
  assert.match(amountLabel({ minAmount: 100, maxAmount: null })!, /^מ-.*100/);
  assert.match(amountLabel({ minAmount: null, maxAmount: 500 })!, /^עד .*500/);
  assert.match(amountLabel({ minAmount: 100, maxAmount: 500 })!, /100.* - .*500/);
});
