import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildDefaultValues,
  buildUpdateFields,
  changedKeys,
  DEFAULT_MEAL_CHOICES,
} from './event-details-form';
import type { EventApp } from '../schemas';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';

function makeEvent(overrides: Partial<EventApp> = {}): EventApp {
  return {
    id: EVENT_ID,
    userId: '22222222-2222-4222-8222-222222222222',
    title: 'The wedding of Dana and Yossi',
    eventDate: '2026-09-25T00:00:00.000Z',
    eventType: 'wedding',
    status: 'published',
    billingStatus: 'free',
    canCreateSchedules: false,
    shortCode: 'abc123',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as EventApp;
}

test('defaults fill every field so nothing starts undefined', () => {
  const values = buildDefaultValues(makeEvent());
  assert.equal(values.eventDate, '2026-09-25T00:00:00.000Z');
  assert.equal(values.receptionTime, '');
  assert.equal(values.location, null);
  assert.equal(values.invitations.imageUrl, '');
  assert.deepEqual(values.hostDetails.bride, { name: '', parents: '' });
  assert.deepEqual(values.hostDetails.child, { name: '', parents: '' });
  assert.equal(values.guestExperience.dietaryOptions, false);
});

test('an event with no date starts with an empty date, not null', () => {
  assert.equal(buildDefaultValues(makeEvent({ eventDate: null })).eventDate, '');
});

test('every meal is offered until the owner narrows the list', () => {
  const values = buildDefaultValues(makeEvent());
  assert.deepEqual(values.guestExperience.dietaryTypes, [...DEFAULT_MEAL_CHOICES]);
});

test('a stored meal list is kept as it is, empty included', () => {
  const values = buildDefaultValues(
    makeEvent({ guestExperience: { dietaryOptions: true, dietaryTypes: [] } }),
  );
  assert.deepEqual(values.guestExperience.dietaryTypes, []);
});

test('host details are read off the stored blob', () => {
  const values = buildDefaultValues(
    makeEvent({
      hostDetails: {
        bride: { name: 'Dana Levi', parents: 'Ruti and Avi Levi' },
        groom: { name: 'Yossi Barak' },
      },
    }),
  );
  assert.deepEqual(values.hostDetails.bride, {
    name: 'Dana Levi',
    parents: 'Ruti and Avi Levi',
  });
  assert.deepEqual(values.hostDetails.groom, { name: 'Yossi Barak', parents: '' });
});

const couple = { couple: true, hasCeremony: true };
const mitzva = { couple: false, hasCeremony: false };

test('nothing dirty is nothing to save', () => {
  assert.deepEqual(changedKeys({}, couple), []);
});

test('a nested leaf is named on its own', () => {
  assert.deepEqual(
    changedKeys({ hostDetails: { bride: { name: true } } }, couple),
    ['brideName'],
  );
});

test('changes are listed in the order the page renders them', () => {
  const dirty = {
    guestExperience: { sendTableNumbers: true },
    eventDate: true,
    hostDetails: { groom: { parents: true } },
  };
  assert.deepEqual(changedKeys(dirty, couple), [
    'groomParents',
    'eventDate',
    'sendTableNumbers',
  ]);
});

test('a dirty meal list counts once however many meals moved', () => {
  const dirty = { guestExperience: { dietaryTypes: [true, undefined, true] } };
  assert.deepEqual(changedKeys(dirty, couple), ['meals']);
});

test('an untouched array is not a change', () => {
  const dirty = { guestExperience: { dietaryTypes: [undefined, undefined] } };
  assert.deepEqual(changedKeys(dirty, couple), []);
});

test('a mitzva never reports a change to the couple it does not have', () => {
  const dirty = {
    hostDetails: { bride: { name: true }, child: { name: true } },
  };
  assert.deepEqual(changedKeys(dirty, mitzva), ['childName']);
});

test('a wedding never reports a change to the celebrant it does not have', () => {
  const dirty = { hostDetails: { child: { parents: true } } };
  assert.deepEqual(changedKeys(dirty, couple), []);
});

test('only a wedding reports a canopy time', () => {
  assert.deepEqual(changedKeys({ ceremonyTime: true }, couple), ['ceremonyTime']);
  assert.deepEqual(changedKeys({ ceremonyTime: true }, mitzva), []);
});

test('the payload carries the id and nothing else when nothing changed', () => {
  const values = buildDefaultValues(makeEvent());
  assert.deepEqual(buildUpdateFields(values, [], { couple: true }), {
    id: EVENT_ID,
  });
});

test('an untouched column is left out of the payload', () => {
  const values = buildDefaultValues(makeEvent());
  const fields = buildUpdateFields(values, ['receptionTime'], { couple: true });
  assert.deepEqual(Object.keys(fields).sort(), ['id', 'receptionTime']);
});

test('two host edits still send one host_details blob', () => {
  const values = buildDefaultValues(
    makeEvent({
      hostDetails: {
        bride: { name: 'Dana', parents: '' },
        groom: { name: 'Yossi', parents: '' },
      },
    }),
  );
  const fields = buildUpdateFields(values, ['brideName', 'groomName'], {
    couple: true,
  });
  assert.deepEqual(Object.keys(fields).sort(), ['hostDetails', 'id']);
  assert.deepEqual(JSON.parse(fields.hostDetails), {
    bride: { name: 'Dana', parents: '' },
    groom: { name: 'Yossi', parents: '' },
  });
});

test('a mitzva sends only the celebrant', () => {
  const values = buildDefaultValues(
    makeEvent({
      eventType: 'bat_mitzva',
      hostDetails: { child: { name: 'Mia Cohen', parents: 'Shira and Itai' } },
    }),
  );
  const fields = buildUpdateFields(values, ['childName'], { couple: false });
  assert.deepEqual(JSON.parse(fields.hostDetails), {
    child: { name: 'Mia Cohen', parents: 'Shira and Itai' },
  });
});

test('a removed image sends an empty url rather than nothing', () => {
  const values = buildDefaultValues(
    makeEvent({ invitations: { imageUrl: 'https://example.test/a.png' } }),
  );
  values.invitations.imageUrl = '';
  const fields = buildUpdateFields(values, ['invitation'], { couple: true });
  assert.deepEqual(JSON.parse(fields.invitations), { imageUrl: '' });
});

test('a location that was never set sends an empty name', () => {
  const values = buildDefaultValues(makeEvent());
  const fields = buildUpdateFields(values, ['location'], { couple: true });
  assert.deepEqual(JSON.parse(fields.location), { name: '' });
});

test('any guest experience edit sends the whole object', () => {
  const values = buildDefaultValues(makeEvent());
  values.guestExperience.lockGuestCount = true;
  const fields = buildUpdateFields(values, ['lockGuestCount'], { couple: true });
  assert.deepEqual(JSON.parse(fields.guestExperience), {
    dietaryOptions: false,
    dietaryTypes: [...DEFAULT_MEAL_CHOICES],
    lockGuestCount: true,
    sendTableNumbers: false,
  });
});
