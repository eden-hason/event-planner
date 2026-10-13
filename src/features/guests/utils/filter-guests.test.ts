import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GuestWithGroupApp } from '@/features/guests/schemas';
import { filterGuests } from './filter-guests';
import { transportationSummary } from './transportation-summary';

const guest = (id: string, overrides: Partial<GuestWithGroupApp> = {}): GuestWithGroupApp => ({
  id,
  eventId: null,
  name: `Guest ${id}`,
  rsvpStatus: 'confirmed',
  mealCounts: {},
  amount: 1,
  createdAt: '2026-10-13T00:00:00Z',
  updatedAt: '2026-10-13T00:00:00Z',
  invitationToken: '2d9c5e74-8c3a-4e3b-9f3a-9b5a4d3c2e1f',
  ...overrides,
});

const NO_FILTERS = {
  searchTerm: '',
  groupIds: [],
  statuses: [],
  sides: [],
  noPhoneOnly: false,
  transport: null,
};

const guests = [
  guest('yes', { needsTransportation: true, amount: 3 }),
  guest('no', { needsTransportation: false }),
  guest('unanswered', { needsTransportation: null, amount: 2 }),
  guest('pending', { rsvpStatus: 'pending', needsTransportation: null }),
  guest('declined-yes', { rsvpStatus: 'declined', needsTransportation: true }),
];

const ids = (transport: 'yes' | 'no' | 'unanswered' | null) =>
  filterGuests(guests, { ...NO_FILTERS, transport }).map((g) => g.id);

describe('filterGuests by transportation answer', () => {
  it('leaves the list alone without the filter', () => {
    assert.equal(ids(null).length, guests.length);
  });

  it('shows confirmed records by their answer', () => {
    assert.deepEqual(ids('yes'), ['yes']);
    assert.deepEqual(ids('no'), ['no']);
    assert.deepEqual(ids('unanswered'), ['unanswered']);
  });

  it('never shows a pending or declined record - they were never asked', () => {
    for (const answer of ['yes', 'no', 'unanswered'] as const) {
      assert.ok(!ids(answer).includes('pending'));
      assert.ok(!ids(answer).includes('declined-yes'));
    }
  });

  it('shows exactly the records the summary counts', () => {
    const summary = transportationSummary(guests);
    for (const answer of ['yes', 'no', 'unanswered'] as const) {
      const heads = filterGuests(guests, { ...NO_FILTERS, transport: answer })
        .reduce((sum, g) => sum + g.amount, 0);
      assert.equal(heads, summary[answer]);
    }
  });

  it('combines with the other filters', () => {
    const found = filterGuests(guests, { ...NO_FILTERS, transport: 'yes', searchTerm: 'nobody' });
    assert.deepEqual(found, []);
  });
});
