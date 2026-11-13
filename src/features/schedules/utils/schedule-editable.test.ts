import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isScheduleEditable } from './schedule-editable';

test('a Schedule is editable until it is sent, switched off, expired, locked or claimed', () => {
  assert.equal(isScheduleEditable({ status: 'pending', dispatchedAt: null }), true);
  assert.equal(isScheduleEditable({ status: null }), true);
  for (const status of ['sent', 'cancelled', 'expired', 'disabled']) {
    assert.equal(isScheduleEditable({ status }), false, status);
  }
  assert.equal(
    isScheduleEditable({ status: 'pending', dispatchedAt: '2026-11-13T08:00:00Z' }),
    false,
  );
});
