import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPhone } from '@/lib/phone';
import { buildChangedAnswersSheetRows } from './export-changed-answers';
import type { ChangedAnswer } from './changed-answers';

// Echoes the key, with the count when there is one, so the test reads the layout.
const t = (key: string, values?: Record<string, number>) =>
  values ? `${key}:${values.count}` : key;

const row: ChangedAnswer = {
  guestId: 'g1',
  name: 'Dana',
  phone: '+972548129777',
  previous: { status: 'confirmed', amount: 2, at: '2026-10-08T20:55:00Z' },
  current: { status: 'declined', amount: null, at: '2026-11-05T17:21:00Z' },
  kind: 'declined',
  history: [
    { status: 'confirmed', amount: 2, at: '2026-10-08T20:55:00Z' },
    { status: 'declined', amount: null, at: '2026-11-05T17:21:00Z' },
  ],
};

test('one header row, then one row per guest in Israel time', () => {
  assert.deepEqual(buildChangedAnswersSheetRows([row], { t, rtl: false }), [
    ['name', 'phone', 'previous', 'current', 'kind', 'changedAt', 'history'],
    [
      'Dana',
      formatPhone('+972548129777'),
      'coming:2',
      'notComing',
      'kindDeclined',
      '05/11/2026 19:21',
      'coming:2 (08/10 23:55) → notComing (05/11 19:21)',
    ],
  ]);
});

test('the history points right to left in Hebrew', () => {
  const [, cells] = buildChangedAnswersSheetRows([row], { t, rtl: true });
  assert.equal(cells[6], 'coming:2 (08/10 23:55) ← notComing (05/11 19:21)');
});

test('a confirm whose count was never kept reads as coming, without a number', () => {
  const [, cells] = buildChangedAnswersSheetRows(
    [{ ...row, previous: { status: 'confirmed', amount: null, at: null } }],
    { t, rtl: false },
  );
  assert.equal(cells[2], 'comingNoCount');
});
