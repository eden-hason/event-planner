import { israelToday, israelWallClockParts } from '@/lib/date-time';
// The utils barrel rather than the feature barrel, which also carries Server
// Actions - this stays pure, so the client toolbar and the tests can import it.
import { formatShekels } from '@/features/billing/utils';
import type {
  PaymentIndexRow,
  PaymentsIndexFilters,
  PaymentsIndexSortKey,
  SortDirection,
} from '../types';

type SearchParams = Record<string, string | string[] | undefined>;

const SORT_KEYS: readonly PaymentsIndexSortKey[] = ['date', 'amount'];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR = /^\d{4}$/;
/** Far above any real payment, so a mistyped bound cannot make the URL absurd. */
const MAX_AMOUNT = 10_000_000;

/** Newest payments and the largest amounts first: what an Operator looks for. */
export const DEFAULT_PAYMENTS_SORT_DIRECTION: Record<PaymentsIndexSortKey, SortDirection> = {
  date: 'desc',
  amount: 'desc',
};

export const DEFAULT_PAYMENTS_INDEX_FILTERS: PaymentsIndexFilters = {
  q: '',
  year: null,
  month: null,
  minAmount: null,
  maxAmount: null,
  sort: 'date',
  dir: 'desc',
  page: 1,
};

function one(params: SearchParams, key: string): string | null {
  const value = params[key];
  return typeof value === 'string' && value ? value : null;
}

/** A non-negative shekel amount, or null for anything else. */
export function parseAmount(value: string | null | undefined): number | null {
  if (value == null || !value.trim()) return null;
  const amount = Number(value.trim().replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.min(amount, MAX_AMOUNT);
}

/** Reads the Payments index state out of the URL, dropping anything malformed. */
export function parsePaymentsIndexParams(params: SearchParams): PaymentsIndexFilters {
  const sortValue = one(params, 'sort');
  const sort = SORT_KEYS.includes(sortValue as PaymentsIndexSortKey)
    ? (sortValue as PaymentsIndexSortKey)
    : DEFAULT_PAYMENTS_INDEX_FILTERS.sort;
  const dirValue = one(params, 'dir');
  const monthValue = one(params, 'month');
  const month = monthValue && MONTH.test(monthValue) ? monthValue : null;
  const yearValue = one(params, 'year');
  // A month already names its year, so the two can never disagree.
  const year = month ? month.slice(0, 4) : yearValue && YEAR.test(yearValue) ? yearValue : null;
  let minAmount = parseAmount(one(params, 'min'));
  let maxAmount = parseAmount(one(params, 'max'));
  // Bounds entered the wrong way round still mean the range between them.
  if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
    [minAmount, maxAmount] = [maxAmount, minAmount];
  }
  return {
    q: (one(params, 'q') ?? '').slice(0, 100),
    year,
    month,
    minAmount,
    maxAmount,
    sort,
    dir: dirValue === 'asc' || dirValue === 'desc' ? dirValue : DEFAULT_PAYMENTS_SORT_DIRECTION[sort],
    page: Math.max(1, Number.parseInt(one(params, 'page') ?? '1', 10) || 1),
  };
}

/**
 * The URL for the Payments index with `patch` applied. Any change other than
 * the page itself goes back to page 1, so narrowing the list never strands the
 * Operator on a page that no longer exists.
 */
export function paymentsIndexHref(
  filters: PaymentsIndexFilters,
  patch: Partial<PaymentsIndexFilters> = {},
): string {
  const next = { ...filters, ...patch, page: patch.page ?? 1 };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  // The month carries its year; a year alone means the whole year.
  if (next.month) params.set('month', next.month);
  else if (next.year) params.set('year', next.year);
  if (next.minAmount !== null) params.set('min', String(next.minAmount));
  if (next.maxAmount !== null) params.set('max', String(next.maxAmount));
  if (next.sort !== DEFAULT_PAYMENTS_INDEX_FILTERS.sort || next.dir !== DEFAULT_PAYMENTS_INDEX_FILTERS.dir) {
    params.set('sort', next.sort);
    params.set('dir', next.dir);
  }
  if (next.page > 1) params.set('page', String(next.page));
  const query = params.toString();
  return query ? `/admin/payments?${query}` : '/admin/payments';
}

/** Search or any filter narrows the list; sorting and paging do not. */
export function hasPaymentsIndexFilters(filters: PaymentsIndexFilters): boolean {
  return !!filters.q.trim() || !!filters.year || !!filters.month || filters.minAmount !== null || filters.maxAmount !== null;
}

/** The Israel calendar month a payment was made in, YYYY-MM. */
export function paymentMonth(occurredAt: string): string {
  return israelWallClockParts(occurredAt).date.slice(0, 7);
}

/** The current month in Israel, YYYY-MM. */
export function currentIsraelMonth(now: Date = new Date()): string {
  return israelToday(now).slice(0, 7);
}

/**
 * The years the year filter offers, newest first: every year with a payment,
 * and always the current one, so the list is never empty.
 */
export function paymentYears(rows: Pick<PaymentIndexRow, 'occurredAt'>[], now: Date = new Date()): string[] {
  const years = new Set(rows.map((row) => paymentMonth(row.occurredAt).slice(0, 4)));
  years.add(currentIsraelMonth(now).slice(0, 4));
  return [...years].sort((a, b) => b.localeCompare(a));
}

/**
 * The filter for picking `year`. A chosen month moves to the same month of the
 * new year, so stepping between years keeps the comparison; a month that has
 * not happened yet there falls back to the whole year.
 */
export function yearPatch(
  filters: Pick<PaymentsIndexFilters, 'month'>,
  year: string | null,
  now: Date = new Date(),
): Pick<PaymentsIndexFilters, 'year' | 'month'> {
  if (!year) return { year: null, month: null };
  const month = filters.month ? `${year}-${filters.month.slice(5, 7)}` : null;
  return { year, month: month && month <= currentIsraelMonth(now) ? month : null };
}

/** The period the date filters are set to - "אוקטובר 2026", "שנת 2026" - or null for all time. */
export function periodLabel(filters: Pick<PaymentsIndexFilters, 'year' | 'month'>): string | null {
  if (filters.month) return monthLabel(filters.month);
  if (filters.year) return `שנת ${filters.year}`;
  return null;
}

/** The sum of `rows` in shekels, added up in whole agorot so floating point cannot leave a stray fraction. */
export function sumPaymentAmounts(rows: Pick<PaymentIndexRow, 'amount'>[]): number {
  return rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100;
}

const MONTH_LABEL =new Intl.DateTimeFormat('he-IL', { timeZone: 'UTC', month: 'long', year: 'numeric' });

/** "אוקטובר 2026", from YYYY-MM. */
export function monthLabel(month: string): string {
  return MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`));
}

/** What the amount filter is set to, for its button and its chip. */
export function amountLabel(filters: Pick<PaymentsIndexFilters, 'minAmount' | 'maxAmount'>): string | null {
  const { minAmount: min, maxAmount: max } = filters;
  const shekels = (amount: number) => formatShekels(amount, 'he-IL');
  if (min !== null && max !== null) return min === max ? shekels(min) : `${shekels(min)} - ${shekels(max)}`;
  if (min !== null) return `מ-${shekels(min)}`;
  if (max !== null) return `עד ${shekels(max)}`;
  return null;
}

/** Every criterion must hold: the result is the intersection of search and filters. */
export function filterPaymentRows(rows: PaymentIndexRow[], filters: PaymentsIndexFilters): PaymentIndexRow[] {
  // Whitespace is ignored, so "דנה כהן" also finds "דנה  כהן".
  const needle = filters.q.trim().toLocaleLowerCase('en').replace(/\s/g, '');
  return rows.filter((row) => {
    const month = paymentMonth(row.occurredAt);
    if (filters.month && month !== filters.month) return false;
    if (!filters.month && filters.year && month.slice(0, 4) !== filters.year) return false;
    if (filters.minAmount !== null && row.amount < filters.minAmount) return false;
    if (filters.maxAmount !== null && row.amount > filters.maxAmount) return false;
    if (!needle) return true;
    return `${row.ownerName} ${row.ownerEmail ?? ''}`
      .toLocaleLowerCase('en')
      .replace(/\s/g, '')
      .includes(needle);
  });
}

/** Sorts a copy of `rows`. Ties fall back to newest first, then id, so no row moves between pages. */
export function sortPaymentRows(
  rows: PaymentIndexRow[],
  sort: PaymentsIndexSortKey,
  dir: SortDirection,
): PaymentIndexRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  const tieBreak = (a: PaymentIndexRow, b: PaymentIndexRow) =>
    b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id);
  return [...rows].sort((a, b) =>
    sort === 'amount'
      ? sign * (a.amount - b.amount) || tieBreak(a, b)
      : sign * (Date.parse(a.occurredAt) - Date.parse(b.occurredAt)) || a.id.localeCompare(b.id),
  );
}
