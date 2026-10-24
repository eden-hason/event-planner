import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ringSegments } from './ring';

const round = (segments: ReturnType<typeof ringSegments>) =>
  segments.map(({ key, start, length }) => ({
    key,
    start: Math.round(start * 10) / 10,
    length: Math.round(length * 10) / 10,
  }));

test('ringSegments lays parts end to end with a gap after each', () => {
  const segments = ringSegments([
    { key: 'confirmed', n: 145 },
    { key: 'pending', n: 100 },
    { key: 'declined', n: 45 },
  ]);
  assert.deepEqual(round(segments), [
    { key: 'confirmed', start: 0, length: 48.8 },
    { key: 'pending', start: 50, length: 33.3 },
    { key: 'declined', start: 84.5, length: 14.3 },
  ]);
});

test('ringSegments leaves out empty parts', () => {
  const segments = ringSegments([
    { key: 'confirmed', n: 1 },
    { key: 'pending', n: 0 },
    { key: 'declined', n: 1 },
  ]);
  assert.deepEqual(round(segments), [
    { key: 'confirmed', start: 0, length: 48.8 },
    { key: 'declined', start: 50, length: 48.8 },
  ]);
});

test('ringSegments fills the whole ring, with no gap, for a single part', () => {
  assert.deepEqual(round(ringSegments([{ key: 'pending', n: 7 }])), [
    { key: 'pending', start: 0, length: 100 },
  ]);
});

test('ringSegments keeps a part smaller than the gap visible', () => {
  const [, sliver] = ringSegments([
    { key: 'confirmed', n: 999 },
    { key: 'declined', n: 1 },
  ]);
  assert.ok(sliver.length > 0);
});

test('ringSegments is empty when every part is empty', () => {
  assert.deepEqual(ringSegments([{ key: 'confirmed', n: 0 }]), []);
});
