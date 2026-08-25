import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { resolveAdminTopBar } from './topbar.ts';

test('top-level Back Office routes show global search', () => {
  for (const segments of [
    [],
    ['events'],
    ['operations'],
    ['users'],
    ['configuration'],
  ]) {
    assert.deepEqual(resolveAdminTopBar(segments), { kind: 'search' });
  }
});

test('Event and Call Round routes show their breadcrumbs', () => {
  assert.deepEqual(resolveAdminTopBar(['events', 'event-1']), {
    kind: 'event',
    eventId: 'event-1',
  });
  assert.deepEqual(
    resolveAdminTopBar(['events', 'event-1', 'rounds', 'round-1']),
    {
      kind: 'round',
      eventId: 'event-1',
      roundId: 'round-1',
    },
  );
});

test('unknown nested routes fall back to search instead of stale breadcrumbs', () => {
  assert.deepEqual(resolveAdminTopBar(['events', 'event-1', 'unknown']), {
    kind: 'search',
  });
});
