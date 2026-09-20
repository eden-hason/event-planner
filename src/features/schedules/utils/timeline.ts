import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import type { OutreachItemStatus } from '../types';

/**
 * The pure arithmetic behind the schedules timeline.
 *
 * Everything here is a view of two facts the database already holds - the
 * Event date and each Schedule's Due Time - so it lives apart from the
 * components that render it and is tested without a database.
 */

const DAY_MS = 86_400_000;

const ISRAEL_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: ADMIN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The Israel calendar day of an instant, as "YYYY-MM-DD". */
function israelDay(iso: string): string {
  return ISRAEL_DAY.format(new Date(iso));
}

/**
 * Whole days between a Schedule's Due Time and the Event, negative before.
 *
 * Counted as Israel calendar days rather than as elapsed hours: a message due
 * at 00:30 on the morning after the wedding is a day after it, even though
 * barely four hours have passed. `event_date` is a calendar date pinned at
 * 00:00 UTC, so its day is read in UTC; the Due Time is an instant whose clock
 * face is Israel's (ADR 0015).
 *
 * Null when the Event has no date - there is nothing to be relative to.
 */
export function offsetDays(
  eventDate: string | null,
  scheduledDate: string,
): number | null {
  if (!eventDate) return null;

  const eventDay = eventDate.slice(0, 10);
  const dueDay = israelDay(scheduledDate);

  return Math.round((Date.parse(`${dueDay}T00:00:00Z`) - Date.parse(`${eventDay}T00:00:00Z`)) / DAY_MS);
}

/**
 * How a Schedule reads on the timeline.
 *
 * Two mappings that are not one-to-one with the column:
 *
 * - 'disabled' becomes 'locked'. The row was seeded for an Event that cannot
 *   send, so the organiser never declined it - showing it as "off" would claim
 *   a decision they were never offered.
 * - a claimed Schedule ('dispatched_at' set, no outcome yet) reads as sent. Its
 *   messages have left and nothing about it can still be changed, so 'pending'
 *   would be the one reading that is simply untrue. Its results can still be
 *   arriving, which the results tab shows honestly.
 */
export function timelineStatus(
  schedule: { status: string | null; dispatchedAt: string | null },
  /**
   * A call plan's round, when one has been started. The plan's own status says
   * only whether the work was asked for; the round says how it is going, and
   * everything long-lived about it lives there rather than on the Schedule
   * (ADR 0004). Omitted for a message Schedule, which has no round.
   */
  roundStatus?: OutreachItemStatus | null,
): OutreachItemStatus {
  // Two readings the plan always wins: it was never offered, or it was called
  // off. Neither can be contradicted by work that happened anyway.
  if (schedule.status === 'disabled') return 'locked';
  if (schedule.status === 'cancelled') return 'cancelled';

  // Otherwise the round supersedes the plan. A call plan is marked 'sent' the
  // moment an Operator hits Start (ADR 0004), which says only that the work
  // began - the round is what says how it is going, and reporting a round
  // still being worked through as 'sent' would hide days of outcomes.
  if (roundStatus) return roundStatus;

  if (schedule.status === 'expired') return 'expired';
  if (schedule.status === 'sent') return 'sent';
  return schedule.dispatchedAt ? 'sent' : 'pending';
}

/**
 * The shape of "how far this Schedule sits from the Event", without the words.
 *
 * Two places phrase this differently - a card has room for "30 days before",
 * a detail pane for "30 days before the event" - but the branching is the same
 * one, so it is decided here and worded by each caller's own message keys.
 */
export type OffsetPhrase = {
  key: 'dayOf' | 'before' | 'after';
  /** Always positive; the direction is in `key`. */
  count: number;
};

export function offsetPhrase(offset: number | null): OffsetPhrase | null {
  if (offset === null) return null;
  if (offset === 0) return { key: 'dayOf', count: 0 };
  return { key: offset < 0 ? 'before' : 'after', count: Math.abs(offset) };
}

/**
 * The whole hours a Due Time may be authored for, inside a Send Window.
 *
 * The window's end is exclusive - 21:00 is already closed - so the last hour
 * offered is the one before it. Derived rather than written out so the picker
 * cannot drift from the rule the Dispatcher actually applies
 * (utils/send-window.ts, and `sendingConfig().sendWindow` behind it).
 */
export function sendWindowHours(window: {
  start: string;
  end: string;
}): string[] {
  const hour = (clock: string) => Number(clock.slice(0, 2));
  const first = hour(window.start);
  const last = hour(window.end) - 1;
  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) {
    return [];
  }
  return Array.from({ length: last - first + 1 }, (_, i) =>
    `${String(first + i).padStart(2, '0')}:00`,
  );
}

export type TimelineRow<T> =
  | { kind: 'dayMarker' }
  | { kind: 'item'; item: T };

/**
 * Inserts the "day of the event" divider into an ordered timeline.
 *
 * The divider goes immediately before the first entry that falls on or after
 * the Event, which puts it at the end when everything is a run-up and at the
 * start when everything is a follow-up. Exactly one is inserted, and none at
 * all when there is nothing to divide or no Event date to divide by.
 *
 * Callers pass entries already sorted by Due Time.
 */
export function withDayMarker<T extends { offset: number | null }>(
  items: T[],
): TimelineRow<T>[] {
  if (items.length === 0) return [];
  if (items.every((item) => item.offset === null)) {
    return items.map((item) => ({ kind: 'item' as const, item }));
  }

  const rows: TimelineRow<T>[] = [];
  let inserted = false;

  for (const item of items) {
    if (!inserted && item.offset !== null && item.offset >= 0) {
      rows.push({ kind: 'dayMarker' });
      inserted = true;
    }
    rows.push({ kind: 'item', item });
  }

  if (!inserted) rows.push({ kind: 'dayMarker' });

  return rows;
}
