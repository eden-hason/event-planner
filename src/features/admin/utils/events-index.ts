import { formatEventDate, israelToday, israelWallClockParts } from '@/lib/date-time';
// The utils barrel rather than the feature barrel, which also carries Server
// Actions - this stays pure, so the client toolbar and the tests can import it.
import { RECORD_PACKAGE_CHANNELS } from '@/features/billing/utils';
import type { RecordPackageChannel } from '@/features/billing';
import type {
  EventIndexRow,
  EventsIndexCreated,
  EventsIndexFilters,
  EventsIndexPayment,
  EventsIndexSortKey,
  EventsIndexStatus,
  EventsIndexTiming,
  SortDirection,
} from '../types';

type SearchParams = Record<string, string | string[] | undefined>;

const SORT_KEYS: readonly EventsIndexSortKey[] = ['owner', 'date', 'created', 'records'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The direction a column sorts in when first clicked: names A-Z, but the
 * newest-opened and largest Events first, since those are what an Operator is
 * usually after.
 */
export const DEFAULT_SORT_DIRECTION: Record<EventsIndexSortKey, SortDirection> = {
  owner: 'asc',
  date: 'asc',
  created: 'desc',
  records: 'desc',
};

export const DEFAULT_EVENTS_INDEX_FILTERS: EventsIndexFilters = {
  q: '',
  status: null,
  types: [],
  payment: null,
  package: null,
  timing: null,
  created: null,
  createdFrom: null,
  createdTo: null,
  sort: 'date',
  dir: 'asc',
  page: 1,
};

function one(params: SearchParams, key: string): string | null {
  const value = params[key];
  return typeof value === 'string' && value ? value : null;
}

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** Reads the Events index state out of the URL, dropping anything malformed. */
export function parseEventsIndexParams(params: SearchParams): EventsIndexFilters {
  const sort = pick(one(params, 'sort'), SORT_KEYS) ?? DEFAULT_EVENTS_INDEX_FILTERS.sort;
  const created = pick<EventsIndexCreated>(one(params, 'created'), ['week', 'month', 'custom']);
  const from = one(params, 'from');
  const to = one(params, 'to');
  return {
    q: (one(params, 'q') ?? '').slice(0, 100),
    status: pick<EventsIndexStatus>(one(params, 'status'), ['published', 'draft']),
    types: [...new Set((one(params, 'type') ?? '').split(',').filter((key) => /^[a-z0-9_]+$/.test(key)))],
    payment: pick<EventsIndexPayment>(one(params, 'payment'), ['paid', 'unpaid']),
    package: pick<RecordPackageChannel>(one(params, 'package'), RECORD_PACKAGE_CHANNELS),
    timing: pick<EventsIndexTiming>(one(params, 'when'), ['upcoming', 'ended']),
    created,
    createdFrom: created === 'custom' && from && ISO_DATE.test(from) ? from : null,
    createdTo: created === 'custom' && to && ISO_DATE.test(to) ? to : null,
    sort,
    dir: pick<SortDirection>(one(params, 'dir'), ['asc', 'desc']) ?? DEFAULT_SORT_DIRECTION[sort],
    page: Math.max(1, Number.parseInt(one(params, 'page') ?? '1', 10) || 1),
  };
}

/**
 * The URL for the Events index with `patch` applied. Any change other than the
 * page itself goes back to page 1, so narrowing the list never strands the
 * Operator on a page that no longer exists.
 */
export function eventsIndexHref(filters: EventsIndexFilters, patch: Partial<EventsIndexFilters> = {}): string {
  const next = { ...filters, ...patch, page: patch.page ?? 1 };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.types.length) params.set('type', next.types.join(','));
  if (next.payment) params.set('payment', next.payment);
  if (next.package) params.set('package', next.package);
  if (next.timing) params.set('when', next.timing);
  if (next.created) {
    params.set('created', next.created);
    if (next.created === 'custom' && next.createdFrom) params.set('from', next.createdFrom);
    if (next.created === 'custom' && next.createdTo) params.set('to', next.createdTo);
  }
  if (next.status) params.set('status', next.status);
  if (next.sort !== DEFAULT_EVENTS_INDEX_FILTERS.sort || next.dir !== DEFAULT_EVENTS_INDEX_FILTERS.dir) {
    params.set('sort', next.sort);
    params.set('dir', next.dir);
  }
  if (next.page > 1) params.set('page', String(next.page));
  const query = params.toString();
  return query ? `/admin/events?${query}` : '/admin/events';
}

export const PAYMENT_LABELS: Record<EventsIndexPayment, string> = { paid: 'Paid', unpaid: 'Unpaid' };
export const TIMING_LABELS: Record<EventsIndexTiming, string> = { upcoming: 'Upcoming', ended: 'Ended' };
export const CREATED_LABELS: Record<EventsIndexCreated, string> = {
  week: 'This week',
  month: 'This month',
  custom: 'Custom range',
};

export const STATUS_LABELS: Record<EventsIndexStatus, string> = {
  published: 'Published',
  draft: 'Draft',
};

/** Search or any filter narrows the list; sorting and paging do not. */
export function hasEventsIndexFilters(filters: EventsIndexFilters): boolean {
  return (
    !!filters.q.trim() ||
    !!filters.status ||
    filters.types.length > 0 ||
    !!filters.payment ||
    !!filters.package ||
    !!filters.timing ||
    !!filters.created
  );
}

/**
 * Where an Event falls in the default order: upcoming (the day itself
 * included), then ended, then undated. `today` is `israelToday()`, taken once
 * per list rather than per row. `event_date` is stored at 00:00 UTC, so its UTC
 * date is the day the Owner picked.
 */
export function eventDateGroup(eventDate: string | null, today: string): 0 | 1 | 2 {
  if (!eventDate) return 2;
  return new Date(eventDate).toISOString().slice(0, 10) < today ? 1 : 0;
}

/** An Event with no date has not happened yet, so it counts as upcoming. */
export function eventTiming(eventDate: string | null, today: string): EventsIndexTiming {
  return eventDateGroup(eventDate, today) === 1 ? 'ended' : 'upcoming';
}

/** "8 Oct 2026" or "1 Oct 2026 - 8 Oct 2026", from inclusive YYYY-MM-DD bounds. */
export function dateRangeLabel(from: string | null, to: string | null): string {
  const start = from ? formatEventDate(from) : null;
  const end = to ? formatEventDate(to) : null;
  if (start && end && start !== end) return `${start} - ${end}`;
  return start ?? end ?? CREATED_LABELS.custom;
}

/** What the Created filter is set to, for its button and its chip. */
export function createdLabel(filters: Pick<EventsIndexFilters, 'created' | 'createdFrom' | 'createdTo'>): string | null {
  if (!filters.created) return null;
  return filters.created === 'custom'
    ? dateRangeLabel(filters.createdFrom, filters.createdTo)
    : CREATED_LABELS[filters.created];
}

/**
 * The inclusive range of Israel calendar dates a created-date filter covers.
 * The week starts on Sunday, as it does in Israel.
 */
export function createdRange(
  filters: Pick<EventsIndexFilters, 'created' | 'createdFrom' | 'createdTo'>,
  now: Date = new Date(),
): { from: string | null; to: string | null } {
  if (filters.created === 'custom') return { from: filters.createdFrom, to: filters.createdTo };
  if (!filters.created) return { from: null, to: null };
  const today = israelToday(now);
  if (filters.created === 'month') return { from: `${today.slice(0, 8)}01`, to: null };
  const midnight = new Date(`${today}T00:00:00Z`);
  midnight.setUTCDate(midnight.getUTCDate() - midnight.getUTCDay());
  return { from: midnight.toISOString().slice(0, 10), to: null };
}

/**
 * A stored E.164 number as digits, plus its local form: +972521234567 also
 * reads 0521234567. Not `formatPhone`: that returns a number libphonenumber
 * will not validate untouched, and search has to find every stored number.
 */
function phoneDigits(phone: string): string[] {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('972') ? [digits, `0${digits.slice(3)}`] : [digits];
}

/**
 * A matcher for one query, built once per list. It covers the owner's name,
 * phone and email and the Event's title. Whitespace is ignored, and a query
 * made only of phone characters is compared by its digits against both the
 * stored and the local form of the number, so "052-123", "052 123" and
 * "+97252123" all find the same owner.
 */
export function eventSearchMatcher(query: string): (row: EventIndexRow) => boolean {
  const needle = query.trim().toLocaleLowerCase('en').replace(/\s/g, '');
  if (!needle) return () => true;
  const digits = /^[\d+\-()]+$/.test(needle) ? needle.replace(/\D/g, '') : '';
  return (row) => {
    const text = `${row.ownerName} ${row.title} ${row.ownerEmail ?? ''}`.toLocaleLowerCase('en').replace(/\s/g, '');
    if (text.includes(needle)) return true;
    if (digits.length < 3 || !row.ownerPhone) return false;
    return phoneDigits(row.ownerPhone).some((form) => form.includes(digits));
  };
}

/** Every criterion must hold: the result is the intersection of search and filters. */
export function filterEventRows(
  rows: EventIndexRow[],
  filters: EventsIndexFilters,
  now: Date = new Date(),
): EventIndexRow[] {
  const range = createdRange(filters, now);
  const today = israelToday(now);
  const matchesSearch = eventSearchMatcher(filters.q);
  return rows.filter((row) => {
    if (filters.status && row.status !== filters.status) return false;
    if (filters.types.length && !(row.eventTypeKey && filters.types.includes(row.eventTypeKey))) return false;
    if (filters.payment && (row.billingStatus === 'paid') !== (filters.payment === 'paid')) return false;
    if (filters.package && row.packageChannel !== filters.package) return false;
    if (filters.timing && eventTiming(row.eventDate, today) !== filters.timing) return false;
    if (range.from || range.to) {
      const created = israelWallClockParts(row.createdAt).date;
      if (range.from && created < range.from) return false;
      if (range.to && created > range.to) return false;
    }
    return matchesSearch(row);
  });
}

const collator = new Intl.Collator(['he', 'en'], { sensitivity: 'base', numeric: true });

/**
 * Sorts a copy of `rows`. Event Date ascending is the default and is grouped
 * rather than strictly chronological: the soonest upcoming Event first, then
 * ended Events with the most recent first, then undated ones - what an Operator
 * works through day to day. Descending is plain latest-first. Undated Events
 * always sort last.
 */
export function sortEventRows(
  rows: EventIndexRow[],
  sort: EventsIndexSortKey,
  dir: SortDirection,
  now: Date = new Date(),
): EventIndexRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  const today = israelToday(now);
  const tieBreak = (a: EventIndexRow, b: EventIndexRow) =>
    collator.compare(a.title, b.title) || a.id.localeCompare(b.id);

  return [...rows].sort((a, b) => {
    switch (sort) {
      case 'owner':
        return sign * collator.compare(a.ownerName, b.ownerName) || tieBreak(a, b);
      case 'created':
        return sign * a.createdAt.localeCompare(b.createdAt) || tieBreak(a, b);
      case 'records':
        return sign * (a.guestRecords - b.guestRecords) || tieBreak(a, b);
      case 'date': {
        if (!a.eventDate || !b.eventDate) {
          return (a.eventDate ? 0 : 1) - (b.eventDate ? 0 : 1) || tieBreak(a, b);
        }
        const byDate = a.eventDate.localeCompare(b.eventDate);
        if (dir === 'desc') return -byDate || tieBreak(a, b);
        const aGroup = eventDateGroup(a.eventDate, today);
        const groupDifference = aGroup - eventDateGroup(b.eventDate, today);
        if (groupDifference) return groupDifference;
        return (aGroup === 1 ? -byDate : byDate) || tieBreak(a, b);
      }
    }
  });
}
