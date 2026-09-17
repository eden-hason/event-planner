import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { nextOpenSlot, isWithinSendWindow } from './send-window.ts';

/**
 * Every instant here is written as an Israel wall clock and converted, so the
 * test reads in the timezone the rule is written in. September is IDT (+03:00);
 * December is IST (+02:00), which is what makes the DST cases meaningful.
 */
const at = (wallClock: string) => new Date(`${wallClock}+03:00`);
const winter = (wallClock: string) => new Date(`${wallClock}+02:00`);

/** The Israel wall clock of an instant, for readable assertions. */
function israelClock(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const WINDOW = { start: '09:00', end: '21:00' };

// ─── Inside the window: a Due Time is honoured exactly ────────────────────────

test('an instant inside the window is returned unchanged', () => {
  // Wednesday
  const due = at('2026-09-16T10:30');
  assert.equal(nextOpenSlot(due, WINDOW).getTime(), due.getTime());
  assert.equal(isWithinSendWindow(due, WINDOW), true);
});

test('the window is inclusive of its start and exclusive of its end', () => {
  const opening = at('2026-09-16T09:00');
  assert.equal(nextOpenSlot(opening, WINDOW).getTime(), opening.getTime());

  // 21:00 is closed, so it waits for the morning rather than sending on the tick.
  assert.equal(israelClock(nextOpenSlot(at('2026-09-16T21:00'), WINDOW)), '2026-09-17T09:00');
});

// ─── Outside the window ───────────────────────────────────────────────────────

test('before opening holds until the same morning', () => {
  assert.equal(israelClock(nextOpenSlot(at('2026-09-16T03:00'), WINDOW)), '2026-09-16T09:00');
});

test('after closing holds until the next morning', () => {
  assert.equal(israelClock(nextOpenSlot(at('2026-09-16T22:15'), WINDOW)), '2026-09-17T09:00');
});

// ─── The Shabbat block: Friday 15:00 to Saturday 20:00 ────────────────────────

test('Friday morning is open - the block starts at 15:00', () => {
  const due = at('2026-09-18T10:00'); // Friday
  assert.equal(nextOpenSlot(due, WINDOW).getTime(), due.getTime());
});

test('Friday afternoon holds until Saturday evening', () => {
  assert.equal(israelClock(nextOpenSlot(at('2026-09-18T15:00'), WINDOW)), '2026-09-19T20:00');
  assert.equal(israelClock(nextOpenSlot(at('2026-09-18T18:30'), WINDOW)), '2026-09-19T20:00');
});

test('Friday night holds until Saturday evening, not Saturday morning', () => {
  // 23:00 Friday is both outside the window and inside the block. The block is
  // the longer wait and has to win.
  assert.equal(israelClock(nextOpenSlot(at('2026-09-18T23:00'), WINDOW)), '2026-09-19T20:00');
});

test('Saturday daytime holds until Saturday evening', () => {
  assert.equal(israelClock(nextOpenSlot(at('2026-09-19T09:30'), WINDOW)), '2026-09-19T20:00');
});

test('Saturday evening after the block is open', () => {
  const due = at('2026-09-19T20:30');
  assert.equal(nextOpenSlot(due, WINDOW).getTime(), due.getTime());
});

test('Saturday after closing holds until Sunday morning', () => {
  assert.equal(israelClock(nextOpenSlot(at('2026-09-19T21:30'), WINDOW)), '2026-09-20T09:00');
});

test('the longest possible hold is Friday 15:00 to Saturday 20:00', () => {
  const due = at('2026-09-18T15:00');
  const held = nextOpenSlot(due, WINDOW);
  const hours = (held.getTime() - due.getTime()) / 3_600_000;
  assert.equal(hours, 29);
  // ADR 0015 reads this together with SCHEDULE_MAX_LATENESS_HOURS: a 24-hour
  // cutoff would expire the Schedules the guard itself held.
  assert.ok(hours < 48);
});

// ─── DST ──────────────────────────────────────────────────────────────────────

test('the window is wall clock in winter too, not a fixed UTC offset', () => {
  // Israel is +02:00 in December. 09:00 local is 07:00Z, not 06:00Z.
  const held = nextOpenSlot(winter('2026-12-16T03:00'), WINDOW);
  assert.equal(israelClock(held), '2026-12-16T09:00');
  assert.equal(held.toISOString(), '2026-12-16T07:00:00.000Z');
});

test('a winter Friday still blocks on Israel wall clock', () => {
  assert.equal(israelClock(nextOpenSlot(winter('2026-12-18T16:00'), WINDOW)), '2026-12-19T20:00');
});

// ─── Configurability ──────────────────────────────────────────────────────────

test('the window bounds come from configuration', () => {
  const tight = { start: '10:00', end: '12:00' };
  assert.equal(israelClock(nextOpenSlot(at('2026-09-16T09:30'), tight)), '2026-09-16T10:00');
  assert.equal(israelClock(nextOpenSlot(at('2026-09-16T13:00'), tight)), '2026-09-17T10:00');
});

// ─── Idempotence ──────────────────────────────────────────────────────────────

test('the result of a hold is itself always open', () => {
  const samples = [
    '2026-09-16T03:00', '2026-09-16T22:15', '2026-09-18T15:00',
    '2026-09-18T23:00', '2026-09-19T09:30', '2026-09-19T21:30',
  ];
  for (const sample of samples) {
    const held = nextOpenSlot(at(sample), WINDOW);
    assert.equal(isWithinSendWindow(held, WINDOW), true, `${sample} held into a closed slot`);
    assert.equal(nextOpenSlot(held, WINDOW).getTime(), held.getTime(), `${sample} was not stable`);
  }
});
