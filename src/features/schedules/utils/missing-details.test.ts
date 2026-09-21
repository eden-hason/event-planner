import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { missingDetails } from './missing-details.ts';

test('sources become the details the Owner fills in, in order', () => {
  assert.deepEqual(
    missingDetails(['event.location.name', 'event.receptionTime']),
    ['venue', 'receptionTime'],
  );
});

test('lines built from the hosts read as their names, once', () => {
  assert.deepEqual(
    missingDetails(['event.occasionPhrase', 'event.todayLine', 'event.hostDetails.bride.name']),
    ['hosts', 'brideName'],
  );
});

test('a source with nothing to fill in is left out', () => {
  assert.deepEqual(missingDetails(['event.shortCode']), []);
});
