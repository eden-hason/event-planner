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
  sortPaymentRows,
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
    { q: 'דנה', month: '2026-10', minAmount: 100, maxAmount: 1500, sort: 'amount', dir: 'asc', page: 2 },
  );
  const bad = parsePaymentsIndexParams({ month: '2026-13', min: '-5', max: 'abc', sort: 'owner', page: '0' });
  assert.equal(bad.month, null);
  assert.equal(bad.minAmount, null);
  assert.equal(bad.maxAmount, null);
  assert.equal(bad.sort, 'date');
  assert.equal(bad.page, 1);
});

test('amount bounds entered the wrong way round are swapped', () => {
  const parsed = parsePaymentsIndexParams({ min: '900', max: '100' });
  assert.equal(parsed.minAmount, 100);
  assert.equal(parsed.maxAmount, 900);
});

test('the URL round-trips and any change but the page goes back to page 1', () => {
  const state = filters({ q: 'דנה', month: '2026-10', minAmount: 100, maxAmount: null, page: 3 });
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
