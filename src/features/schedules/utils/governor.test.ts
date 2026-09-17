import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { createPacer, createGovernor } from './governor.ts';

// ─── The pacer: when is each release allowed? ─────────────────────────────────

test('releases are spaced by the reciprocal of the rate', () => {
  const pacer = createPacer(50); // 50 per second -> one every 20ms
  assert.equal(pacer.next(1_000), 1_000);
  assert.equal(pacer.next(1_000), 1_020);
  assert.equal(pacer.next(1_000), 1_040);
});

test('an idle gap is not banked into a burst', () => {
  // The whole point of a governor is the instantaneous rate. A caller that
  // pauses must not be handed back the sends it "saved".
  const pacer = createPacer(50);
  pacer.next(1_000);
  assert.equal(pacer.next(5_000), 5_000);
  assert.equal(pacer.next(5_000), 5_020);
});

test('a slot never lands in the past', () => {
  const pacer = createPacer(50);
  pacer.next(1_000);
  pacer.next(1_000);
  assert.ok(pacer.next(1_000) >= 1_000);
});

// ─── halve(): the response to a 429 ───────────────────────────────────────────

test('halve doubles the gap between releases', () => {
  const pacer = createPacer(50);
  assert.equal(pacer.ratePerSecond, 50);
  pacer.halve();
  assert.equal(pacer.ratePerSecond, 25);

  assert.equal(pacer.next(1_000), 1_000);
  assert.equal(pacer.next(1_000), 1_040); // 40ms, not 20
});

test('halving repeatedly floors at one per second rather than reaching zero', () => {
  const pacer = createPacer(50);
  for (let i = 0; i < 20; i += 1) pacer.halve();
  assert.equal(pacer.ratePerSecond, 1);
  assert.equal(pacer.next(0), 0);
  assert.equal(pacer.next(0), 1_000);
});

test('there is no recovery within a run', () => {
  // Deliberate: a run that backed off stays backed off. Meta's throughput
  // budget is account-wide and we cannot see it, so climbing back up during
  // the same drain would just rediscover the limit on other guests.
  const pacer = createPacer(50);
  pacer.halve();
  for (let i = 0; i < 100; i += 1) pacer.next(10_000 + i * 10_000);
  assert.equal(pacer.ratePerSecond, 25);
});

test('halving applies to the gap after the release already booked', () => {
  // The slot for the next release was booked at the old rate when the previous
  // one was handed out, and halve() does not claw it back. So exactly one more
  // message goes at the old spacing and everything after it is slower - a
  // one-message lag, which is not worth the complication of rewinding a cursor
  // other callers may already be sleeping against.
  const pacer = createPacer(50);
  assert.equal(pacer.next(0), 0);
  assert.equal(pacer.next(0), 20); // books the next slot at 40
  pacer.halve();
  assert.equal(pacer.next(0), 40); // the booked slot, honoured
  assert.equal(pacer.next(0), 80); // and now the halved 40ms gap
});

test('a rate below one per second is refused rather than silently clamped', () => {
  assert.throws(() => createPacer(0), /rate/i);
  assert.throws(() => createPacer(-5), /rate/i);
});

// ─── The governor: pacing plus bounded concurrency ────────────────────────────

test('no more than maxInFlight tasks run at once', async () => {
  const governor = createGovernor({ maxPerSecond: 1_000, maxInFlight: 3 });

  let inFlight = 0;
  let peak = 0;
  const task = async () => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
  };

  await Promise.all(Array.from({ length: 20 }, () => governor.run(task)));

  assert.equal(peak, 3);
  assert.equal(inFlight, 0);
});

test('every task runs, and results come back to their own caller', async () => {
  const governor = createGovernor({ maxPerSecond: 1_000, maxInFlight: 4 });
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) => governor.run(async () => i * 2)),
  );
  assert.deepEqual(results, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
});

test('a failing task rejects its own caller without stalling the governor', async () => {
  const governor = createGovernor({ maxPerSecond: 1_000, maxInFlight: 2 });

  await assert.rejects(
    governor.run(async () => {
      throw new Error('boom');
    }),
    /boom/,
  );

  // The in-flight slot must have been released, or this would hang.
  assert.equal(await governor.run(async () => 'still working'), 'still working');
});

test('a slow task holds its slot rather than the whole run', async () => {
  const governor = createGovernor({ maxPerSecond: 1_000, maxInFlight: 2 });
  const order: string[] = [];

  await Promise.all([
    governor.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      order.push('slow');
    }),
    governor.run(async () => {
      order.push('fast-1');
    }),
    governor.run(async () => {
      order.push('fast-2');
    }),
  ]);

  assert.deepEqual(order, ['fast-1', 'fast-2', 'slow']);
});

test('pacing actually delays a run that exceeds the rate', async () => {
  const governor = createGovernor({ maxPerSecond: 100, maxInFlight: 10 });
  const started = Date.now();
  await Promise.all(Array.from({ length: 10 }, () => governor.run(async () => {})));
  // Nine gaps of 10ms. Generous lower bound - this asserts that pacing happens
  // at all, not that the event loop is precise.
  assert.ok(Date.now() - started >= 60, 'ten sends at 100/s finished too fast to have been paced');
});

test('halve is reachable from the governor and takes effect', () => {
  const governor = createGovernor({ maxPerSecond: 50, maxInFlight: 5 });
  assert.equal(governor.ratePerSecond, 50);
  governor.halve();
  assert.equal(governor.ratePerSecond, 25);
});
