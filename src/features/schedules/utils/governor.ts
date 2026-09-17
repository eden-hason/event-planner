/**
 * The throughput governor: one pace for every message Kululu sends.
 *
 * WhatsApp's Throughput Budget belongs to the phone number, not to a Schedule,
 * and every Event shares that one number. The old governor lived inside
 * `sendSchedule`, so it could only ever pace a single Schedule - two Schedules
 * sending together each paced themselves correctly and together breached the
 * limit. It was safe only because the cron happened to loop sequentially.
 *
 * One Worker drains the whole queue, so one governor covers everything (ADR
 * 0013). It does two separate jobs:
 *
 *   - pacing: releases at most N per second, so the budget is not breached
 *   - bounded concurrency: at most M requests outstanding, so a slow Meta does
 *     not accumulate thousands of open sockets behind a healthy release rate
 *
 * Pacing is the interesting half and is separated out as `createPacer`, which
 * takes the clock as an argument and holds no timers - the arithmetic of "when
 * is the next release allowed" is testable without waiting for real seconds.
 */

const MIN_RATE_PER_SECOND = 1;

export type Pacer = {
  /** The instant the next release is allowed, given the current time. */
  next: (now: number) => number;
  /** Back off after a 429. Never recovers within a run. */
  halve: () => void;
  readonly ratePerSecond: number;
};

export function createPacer(ratePerSecond: number): Pacer {
  if (!Number.isFinite(ratePerSecond) || ratePerSecond < MIN_RATE_PER_SECOND) {
    throw new Error(
      `Governor rate must be at least ${MIN_RATE_PER_SECOND} per second, got ${ratePerSecond}`,
    );
  }

  let rate = Math.floor(ratePerSecond);
  let cursor = Number.NEGATIVE_INFINITY;

  return {
    next(now: number) {
      // max(cursor, now) rather than cursor alone: an idle gap is not banked.
      // A Worker that paused for a minute must not be handed sixty seconds'
      // worth of sends to fire at once - the limit is on the instantaneous
      // rate, which is exactly what a burst would breach.
      const slot = Math.max(cursor, now);
      cursor = slot + 1_000 / rate;
      return slot;
    },
    halve() {
      // Floor at one per second: a rate of zero would stall the drain
      // completely, and a Schedule that sends nothing at all is worse than one
      // that sends slowly.
      rate = Math.max(MIN_RATE_PER_SECOND, Math.floor(rate / 2));
    },
    get ratePerSecond() {
      return rate;
    },
  };
}

export type Governor = {
  run: <T>(task: () => Promise<T>) => Promise<T>;
  halve: () => void;
  readonly ratePerSecond: number;
};

const sleep = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

export function createGovernor(options: {
  maxPerSecond: number;
  maxInFlight: number;
}): Governor {
  const pacer = createPacer(options.maxPerSecond);
  const maxInFlight = Math.max(1, Math.floor(options.maxInFlight));

  let inFlight = 0;
  const waiting: (() => void)[] = [];

  /**
   * Slots are handed out in arrival order. Taking the cursor before awaiting
   * anything is what keeps the pacing fair: a caller that queued first gets the
   * earlier slot, rather than whichever caller happens to win the event loop
   * after a sleep.
   */
  const acquireSlot = async () => {
    const slot = pacer.next(Date.now());
    await sleep(slot - Date.now());

    if (inFlight >= maxInFlight) {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    inFlight += 1;
  };

  const releaseSlot = () => {
    inFlight -= 1;
    waiting.shift()?.();
  };

  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      await acquireSlot();
      try {
        return await task();
      } finally {
        // Always, including on a throw: a task that fails still gave its slot
        // back, and losing one would shrink the pipe for the rest of the run.
        releaseSlot();
      }
    },
    halve() {
      pacer.halve();
    },
    get ratePerSecond() {
      return pacer.ratePerSecond;
    },
  };
}
