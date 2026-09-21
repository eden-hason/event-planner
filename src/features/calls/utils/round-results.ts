import type { CallRoundGuestRow, CallRoundSummary } from '../types';

/** The counts a round keeps, in records (one record can be a whole family). */
export type RoundCounts = Pick<
  CallRoundSummary,
  'total' | 'awaiting' | 'confirmed' | 'declined' | 'noAnswer' | 'willUpdate'
>;

export type RoundSegmentKey = 'confirmed' | 'declined' | 'noAnswer' | 'willUpdate';

/**
 * How far a round has got: the guests with an outcome, and each outcome's share
 * of the whole list.
 *
 * Shares are of the whole list, not of the handled part, so the bar fills as the
 * round works through its guests and an unfinished round reads as unfinished.
 * The will-update segment appears only once a call ended that way, matching the
 * fourth outcome tile.
 */
export function roundProgress(counts: RoundCounts): {
  handled: number;
  total: number;
  segments: { key: RoundSegmentKey; percent: number }[];
} {
  const { total } = counts;
  if (total === 0) return { handled: 0, total: 0, segments: [] };

  const share = (n: number) => (n / total) * 100;
  const segments: { key: RoundSegmentKey; percent: number }[] = [
    { key: 'confirmed', percent: share(counts.confirmed) },
    { key: 'declined', percent: share(counts.declined) },
    { key: 'noAnswer', percent: share(counts.noAnswer) },
  ];
  if (counts.willUpdate > 0) {
    segments.push({ key: 'willUpdate', percent: share(counts.willUpdate) });
  }

  return { handled: total - counts.awaiting, total, segments };
}

/**
 * Headcount per outcome. What the Owner plans seating and catering against is
 * people, and one record can stand for a whole family, so a count of records
 * under-states every outcome.
 */
export function peopleByOutcome(rows: CallRoundGuestRow[]) {
  const people = { confirmed: 0, declined: 0, noAnswer: 0, willUpdate: 0, awaiting: 0 };
  for (const row of rows) {
    switch (row.outcome) {
      case 'confirmed':
        people.confirmed += row.amount;
        break;
      case 'declined':
        people.declined += row.amount;
        break;
      case 'no_answer':
        people.noAnswer += row.amount;
        break;
      case 'guest_will_update':
        people.willUpdate += row.amount;
        break;
      default:
        people.awaiting += row.amount;
    }
  }
  return people;
}

/**
 * A guest who was put on the call list, answered on WhatsApp first, and was
 * therefore skipped. Their outcome stays empty for good, which without this
 * flag would read as "your planner never called them".
 */
export function isAlreadyAnswered(row: CallRoundGuestRow): boolean {
  return row.outcome === null && row.currentRsvpStatus !== 'pending';
}

export type GuestFilter =
  | 'all'
  | 'awaiting'
  | 'confirmed'
  | 'declined'
  | 'noAnswer'
  | 'willUpdate'
  | 'hasNote';

const OUTCOME_FOR_FILTER: Partial<Record<GuestFilter, CallRoundGuestRow['outcome']>> = {
  awaiting: null,
  confirmed: 'confirmed',
  declined: 'declined',
  noAnswer: 'no_answer',
  willUpdate: 'guest_will_update',
};

export function filterGuestRows(
  rows: CallRoundGuestRow[],
  { filter, query }: { filter: GuestFilter; query: string },
): CallRoundGuestRow[] {
  const needle = query.trim().toLowerCase();

  return rows.filter((row) => {
    if (needle && !row.guestName.toLowerCase().includes(needle)) return false;
    if (filter === 'all') return true;
    if (filter === 'hasNote') return Boolean(row.notes);
    return row.outcome === OUTCOME_FOR_FILTER[filter];
  });
}

/**
 * The filters worth offering for this round: one per outcome that some guest
 * actually has. A chip that always leads to an empty list is noise, and on a
 * finished round "still waiting" would be a lie.
 */
export function availableFilters(rows: CallRoundGuestRow[]): GuestFilter[] {
  const offered: GuestFilter[] = ['all'];
  const order: GuestFilter[] = ['awaiting', 'confirmed', 'declined', 'noAnswer', 'willUpdate'];

  for (const filter of order) {
    if (rows.some((row) => row.outcome === OUTCOME_FOR_FILTER[filter])) offered.push(filter);
  }
  if (rows.some((row) => row.notes)) offered.push('hasNote');

  return offered;
}

/**
 * The page numbers a pager shows: all of them when there are few, otherwise a
 * window of `max` around the current page (zero-based in and out), kept inside
 * the range so the window does not shrink at either end.
 */
export function pageWindow(current: number, total: number, max = 5): number[] {
  const size = Math.min(max, total);
  const start = Math.min(Math.max(current - Math.floor(size / 2), 0), total - size);
  return Array.from({ length: size }, (_, i) => start + i);
}
