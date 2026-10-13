import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppToDbTransformerSchema, DbToAppTransformerSchema } from '.';

const dbRow = {
  id: '0b7a3c52-6a1e-4c1f-9d1e-7f3e2b1a0c9d',
  event_id: '1c8b4d63-7b2f-4d2a-8e2f-8a4f3c2b1d0e',
  name: 'משפחת כהן',
  phone_number: null,
  group_id: null,
  rsvp_status: 'confirmed',
  meal_counts: {},
  amount: 2,
  notes: null,
  side: null,
  created_at: '2026-10-13T00:00:00Z',
  updated_at: '2026-10-13T00:00:00Z',
  invitation_token: '2d9c5e74-8c3a-4e3b-9f3a-9b5a4d3c2e1f',
};

describe('guest transportation answer', () => {
  it('reads yes, no and unanswered apart', () => {
    const read = (value: unknown) =>
      DbToAppTransformerSchema.parse({ ...dbRow, needs_transportation: value }).needsTransportation;
    assert.equal(read(true), true);
    assert.equal(read(false), false);
    assert.equal(read(null), null);
  });

  it('reads a row from before the column existed as unanswered', () => {
    assert.equal(DbToAppTransformerSchema.parse(dbRow).needsTransportation, null);
  });

  it('writes the answer only when one is given, null included', () => {
    assert.equal(AppToDbTransformerSchema.parse({ needsTransportation: false }).needs_transportation, false);
    assert.equal(AppToDbTransformerSchema.parse({ needsTransportation: null }).needs_transportation, null);
    assert.ok(!('needs_transportation' in AppToDbTransformerSchema.parse({ name: 'משפחת כהן' })));
  });
});
