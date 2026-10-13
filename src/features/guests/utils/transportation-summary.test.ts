import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { transportationSummary } from './transportation-summary';

type Row = Parameters<typeof transportationSummary>[0][number];

const row = (overrides: Partial<Row> = {}): Row => ({
  rsvpStatus: 'confirmed',
  amount: 1,
  needsTransportation: null,
  ...overrides,
});

describe('transportationSummary', () => {
  it('counts yes and no apart, in Guests', () => {
    const summary = transportationSummary([
      row({ needsTransportation: true, amount: 3 }),
      row({ needsTransportation: true, amount: 2 }),
      row({ needsTransportation: false, amount: 4 }),
    ]);
    assert.deepEqual(summary, { yes: 5, no: 4, unanswered: 0 });
  });

  it('never counts an unanswered record as "no"', () => {
    const summary = transportationSummary([
      row({ needsTransportation: null, amount: 2 }),
      row({ needsTransportation: undefined }),
      row({ needsTransportation: false }),
    ]);
    assert.deepEqual(summary, { yes: 0, no: 1, unanswered: 3 });
  });

  it('leaves out records that are not coming', () => {
    const summary = transportationSummary([
      row({ rsvpStatus: 'pending' }),
      row({ rsvpStatus: 'declined', needsTransportation: true }),
      row({ rsvpStatus: 'pending', needsTransportation: false }),
    ]);
    assert.deepEqual(summary, { yes: 0, no: 0, unanswered: 0 });
  });

  it('follows a changed answer', () => {
    const before = [row({ needsTransportation: true, amount: 2 })];
    const after = [row({ needsTransportation: false, amount: 2 })];
    assert.deepEqual(transportationSummary(before), { yes: 2, no: 0, unanswered: 0 });
    assert.deepEqual(transportationSummary(after), { yes: 0, no: 2, unanswered: 0 });
  });

  it('is all zeroes for an empty list', () => {
    assert.deepEqual(transportationSummary([]), { yes: 0, no: 0, unanswered: 0 });
  });
});
