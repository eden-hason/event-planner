import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createdLabel,
  createdRange,
  DEFAULT_EVENTS_INDEX_FILTERS,
  eventSearchMatcher,
  eventsIndexHref,
  eventTiming,
  filterEventRows,
  hasEventsIndexFilters,
  parseEventsIndexParams,
  sortEventRows,
} from './events-index';
import type { EventIndexRow, EventsIndexFilters } from '../types';

// Thursday 8 October 2026, 10:00 in Israel.
const NOW = new Date('2026-10-08T07:00:00Z');

function row(overrides: Partial<EventIndexRow> = {}): EventIndexRow {
  return {
    id: 'e1',
    title: 'Dana & Yoni',
    status: 'published',
    eventDate: '2026-11-01',
    createdAt: '2026-10-01T09:00:00Z',
    eventTypeKey: 'wedding',
    eventTypeName: 'Wedding',
    ownerName: 'Dana Levi',
    ownerEmail: 'dana@example.com',
    ownerPhone: '+972521234567',
    billingStatus: 'free',
    packageChannel: null,
    guestRecords: 120,
    ...overrides,
  };
}

const filters = (overrides: Partial<EventsIndexFilters> = {}): EventsIndexFilters => ({
  ...DEFAULT_EVENTS_INDEX_FILTERS,
  ...overrides,
});

test('parsing drops malformed params and keeps valid ones', () => {
  const parsed = parseEventsIndexParams({
    q: 'dana',
    type: 'wedding,henna,DROP TABLE,wedding',
    payment: 'unpaid',
    package: 'carrier_pigeon',
    when: 'ended',
    created: 'custom',
    from: '2026-10-01',
    to: 'yesterday',
    sort: 'records',
    page: '-4',
  });
  assert.deepEqual(parsed.types, ['wedding', 'henna']);
  assert.equal(parsed.payment, 'unpaid');
  assert.equal(parsed.package, null);
  assert.equal(parsed.timing, 'ended');
  assert.equal(parsed.createdFrom, '2026-10-01');
  assert.equal(parsed.createdTo, null);
  assert.equal(parsed.sort, 'records');
  assert.equal(parsed.dir, 'desc', 'records sorts largest first by default');
  assert.equal(parsed.page, 1);
});

test('the href round-trips through the parser', () => {
  const state = filters({
    q: '052',
    types: ['wedding', 'henna'],
    payment: 'paid',
    package: 'whatsapp_calls',
    timing: 'upcoming',
    created: 'custom',
    createdFrom: '2026-09-01',
    createdTo: '2026-09-30',
    status: 'published',
    sort: 'owner',
    dir: 'desc',
    page: 3,
  });
  const href = eventsIndexHref(state, { page: 3 });
  const parsed = parseEventsIndexParams(Object.fromEntries(new URL(href, 'http://x').searchParams));
  assert.deepEqual(parsed, state);
});

test('any change but the page goes back to page 1, and the default sort stays out of the URL', () => {
  const state = filters({ page: 4 });
  assert.equal(eventsIndexHref(state, { payment: 'unpaid' }), '/admin/events?payment=unpaid');
  assert.equal(eventsIndexHref(state, { page: 5 }), '/admin/events?page=5');
  assert.equal(eventsIndexHref(filters({ sort: 'owner', dir: 'asc' })), '/admin/events?sort=owner&dir=asc');
});

test('sorting and paging are not filters', () => {
  assert.equal(hasEventsIndexFilters(filters({ sort: 'owner', page: 2 })), false);
  assert.equal(hasEventsIndexFilters(filters({ q: '   ' })), false);
  assert.equal(hasEventsIndexFilters(filters({ timing: 'ended' })), true);
});

test('an Event ends after its date, not on it, and an undated Event is upcoming', () => {
  const today = '2026-10-08';
  assert.equal(eventTiming('2026-10-08T00:00:00+00:00', today), 'upcoming');
  assert.equal(eventTiming('2026-10-07T00:00:00+00:00', today), 'ended');
  assert.equal(eventTiming(null, today), 'upcoming');
});

test('search finds the owner by name, title, email or any form of the phone', () => {
  const dana = row();
  for (const query of ['dana', 'DANA LEVI', 'yoni', 'example.com', '052', '052-123', '052 1234567', '+97252', '1234567']) {
    assert.ok(eventSearchMatcher(query)(dana), query);
  }
  for (const query of ['moshe', '053', '05']) {
    assert.ok(!eventSearchMatcher(query)(dana), query);
  }
  assert.ok(!eventSearchMatcher('052')(row({ ownerPhone: null })));
});

test('created this week starts on Sunday and this month on the 1st, in Israel time', () => {
  assert.deepEqual(createdRange({ created: 'week', createdFrom: null, createdTo: null }, NOW), {
    from: '2026-10-04',
    to: null,
  });
  assert.deepEqual(createdRange({ created: 'month', createdFrom: null, createdTo: null }, NOW), {
    from: '2026-10-01',
    to: null,
  });
});

test('filters intersect', () => {
  const rows = [
    row({ id: 'paid-wedding', billingStatus: 'paid', packageChannel: 'whatsapp' }),
    row({ id: 'unpaid-wedding' }),
    row({ id: 'pending-henna', eventTypeKey: 'henna', billingStatus: 'payment_pending' }),
    row({ id: 'ended-wedding', eventDate: '2026-09-01', ownerName: 'Avi Cohen', ownerPhone: '+972531112222' }),
    row({ id: 'opened-sunday', createdAt: '2026-10-03T22:30:00Z' }),
    row({ id: 'draft', status: 'draft' }),
  ];
  const ids = (state: Partial<EventsIndexFilters>) => filterEventRows(rows, filters(state), NOW).map((r) => r.id);

  assert.deepEqual(ids({ payment: 'unpaid', types: ['henna'] }), ['pending-henna'], 'pending counts as unpaid');
  assert.deepEqual(ids({ types: ['wedding'], package: 'whatsapp' }), ['paid-wedding']);
  assert.deepEqual(ids({ q: '053', timing: 'ended' }), ['ended-wedding']);
  assert.deepEqual(ids({ q: 'avi', timing: 'upcoming' }), []);
  // 22:30 UTC on Saturday is 01:30 on Sunday in Israel - inside this week.
  assert.deepEqual(ids({ created: 'week' }), ['opened-sunday']);
  assert.deepEqual(ids({ created: 'custom', createdFrom: '2026-10-01', createdTo: '2026-10-01' }).length, 5);
  assert.deepEqual(ids({ status: 'draft' }), ['draft']);
});

test('the default date order is upcoming soonest, then ended most recent, then undated', () => {
  const rows = [
    row({ id: 'undated', eventDate: null }),
    row({ id: 'ended-long-ago', eventDate: '2026-01-01' }),
    row({ id: 'next-year', eventDate: '2027-06-01' }),
    row({ id: 'ended-last-week', eventDate: '2026-10-01' }),
    row({ id: 'today', eventDate: '2026-10-08' }),
  ];
  const ids = (sorted: EventIndexRow[]) => sorted.map((r) => r.id);
  assert.deepEqual(ids(sortEventRows(rows, 'date', 'asc', NOW)), [
    'today',
    'next-year',
    'ended-last-week',
    'ended-long-ago',
    'undated',
  ]);
  assert.deepEqual(ids(sortEventRows(rows, 'date', 'desc', NOW)), [
    'next-year',
    'today',
    'ended-last-week',
    'ended-long-ago',
    'undated',
  ]);
});

test('owner, created and records sort both ways', () => {
  const rows = [
    row({ id: 'b', ownerName: 'Bella', createdAt: '2026-10-02T00:00:00Z', guestRecords: 5 }),
    row({ id: 'a', ownerName: 'adam', createdAt: '2026-10-03T00:00:00Z', guestRecords: 50 }),
    row({ id: 'c', ownerName: 'Carmel', createdAt: '2026-10-01T00:00:00Z', guestRecords: 500 }),
  ];
  const ids = (sorted: EventIndexRow[]) => sorted.map((r) => r.id).join('');
  assert.equal(ids(sortEventRows(rows, 'owner', 'asc', NOW)), 'abc');
  assert.equal(ids(sortEventRows(rows, 'owner', 'desc', NOW)), 'cba');
  assert.equal(ids(sortEventRows(rows, 'created', 'desc', NOW)), 'abc');
  assert.equal(ids(sortEventRows(rows, 'records', 'desc', NOW)), 'cab');
  assert.equal(ids(sortEventRows(rows, 'records', 'asc', NOW)), 'bac');
});

test('the Created label names a preset or the custom range', () => {
  assert.equal(createdLabel({ created: null, createdFrom: null, createdTo: null }), null);
  assert.equal(createdLabel({ created: 'week', createdFrom: null, createdTo: null }), 'This week');
  assert.equal(createdLabel({ created: 'custom', createdFrom: '2026-10-01', createdTo: '2026-10-01' }), '1 Oct 2026');
  assert.equal(
    createdLabel({ created: 'custom', createdFrom: '2026-10-01', createdTo: '2026-10-08' }),
    '1 Oct 2026 - 8 Oct 2026',
  );
});
