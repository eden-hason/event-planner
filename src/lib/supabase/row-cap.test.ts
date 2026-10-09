import assert from 'node:assert/strict';
import { test } from 'node:test';
import { embeddedCount, PAGE_SIZE, pageAll } from './row-cap';

/** A table of `total` rows behind a fake PostgREST that caps every response at PAGE_SIZE. */
function table(total: number, failAt?: number) {
  const ranges: [number, number][] = [];
  const fetchPage = async (from: number, to: number) => {
    ranges.push([from, to]);
    if (from === failAt) return { data: null, error: { message: 'boom' } };
    const end = Math.min(to + 1, total, from + PAGE_SIZE);
    const data = Array.from({ length: Math.max(0, end - from) }, (_, i) => from + i);
    return { data, error: null };
  };
  return { fetchPage, ranges };
}

test('reads past the cap to every row', async () => {
  const { fetchPage, ranges } = table(2 * PAGE_SIZE + 150);
  const rows = await pageAll(fetchPage);
  assert.equal(rows.length, 2 * PAGE_SIZE + 150);
  assert.deepEqual(new Set(rows).size, rows.length);
  assert.deepEqual(ranges, [
    [0, PAGE_SIZE - 1],
    [PAGE_SIZE, 2 * PAGE_SIZE - 1],
    [2 * PAGE_SIZE, 3 * PAGE_SIZE - 1],
  ]);
});

test('stops after one request when the first page is short', async () => {
  const { fetchPage, ranges } = table(12);
  assert.equal((await pageAll(fetchPage)).length, 12);
  assert.equal(ranges.length, 1);
});

test('asks once more when the rows end exactly on a page boundary', async () => {
  const { fetchPage, ranges } = table(PAGE_SIZE);
  assert.equal((await pageAll(fetchPage)).length, PAGE_SIZE);
  assert.equal(ranges.length, 2);
});

test('throws rather than return a partial list', async () => {
  const { fetchPage } = table(3 * PAGE_SIZE, PAGE_SIZE);
  await assert.rejects(pageAll(fetchPage), /boom/);
});

test('reads an embedded count, and zero when it is missing', () => {
  assert.equal(embeddedCount([{ count: 1234 }]), 1234);
  assert.equal(embeddedCount([]), 0);
  assert.equal(embeddedCount(null), 0);
});
