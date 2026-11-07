import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toFileName } from './sheet';

test('file names drop forbidden characters and empty parts', () => {
  assert.equal(toFileName('Dana & Avi: 2027/05', 'Gifts'), 'Dana & Avi 202705 - Gifts');
  assert.equal(toFileName(undefined, 'Expenses'), 'Expenses');
  assert.equal(toFileName('  ', 'Expenses'), 'Expenses');
});
