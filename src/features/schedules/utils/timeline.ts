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
export function timelineStatus(schedule: {
  status: string | null;
  dispatchedAt: string | null;
}): OutreachItemStatus {
  switch (schedule.status) {
    case 'disabled':
      return 'locked';
    case 'cancelled':
      return 'cancelled';
    case 'expired':
      return 'expired';
    case 'sent':
      return 'sent';
    default:
      return schedule.dispatchedAt ? 'sent' : 'pending';
  }
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
