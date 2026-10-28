import type { CallRoundGuestRow, CallRoundSummary } from '../types';

/** The counts a round keeps, in records (one record can be a whole family). */
export type RoundCounts = Pick<
  CallRoundSummary,
  'total' | 'awaiting' | 'confirmed' | 'declined' | 'noAnswer'
>;

export type RoundSegmentKey = 'confirmed' | 'declined' | 'noAnswer';

/**
 * How far a round has got: the guests with an outcome, and each outcome's share
 * of the whole list.
 *
 * Shares are of the whole list, not of the handled part, so the bar fills as the
 * round works through its guests and an unfinished round reads as unfinished.
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

  return { handled: total - counts.awaiting, total, segments };
}

/**
 * Headcount per outcome. What the Owner plans seating and catering against is
 * people, and one record can stand for a whole family, so a count of records
 * under-states every outcome.
 */
export function peopleByOutcome(rows: CallRoundGuestRow[]) {
  const people = { confirmed: 0, declined: 0, noAnswer: 0, awaiting: 0 };
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

/**
 * What a guest's row leads with, and what the details explain.
 *
 * `kind` is the call when there was one. Without one it splits on the RSVP: a
 * guest still pending is waiting for the call, and a guest who already answered
 * was skipped on purpose (`answeredFirst`), which is never "not called".
 *
 * `now` is the RSVP only when it says something the call did not: a guest who
 * did not pick up and confirmed on WhatsApp later, or one who changed their
 * answer after the call. A confirmed call with a confirmed RSVP repeats itself.
 */
export type GuestCallStatus = {
  kind: 'confirmed' | 'declined' | 'noAnswer' | 'notCalled' | 'answeredFirst';
  now: 'confirmed' | 'declined' | null;
  explain: 'answeredFirst' | 'answeredSince' | 'notCalled' | 'changed' | null;
};

const OUTCOME_KIND = {
  confirmed: 'confirmed',
  declined: 'declined',
  no_answer: 'noAnswer',
} as const;

export function guestCallStatus(row: CallRoundGuestRow): GuestCallStatus {
  const rsvp = row.currentRsvpStatus;
  if (row.outcome === null) {
    return rsvp === 'pending'
      ? { kind: 'notCalled', now: null, explain: 'notCalled' }
      : { kind: 'answeredFirst', now: null, explain: 'answeredFirst' };
  }

  const kind = OUTCOME_KIND[row.outcome];
  const now = rsvp !== 'pending' && rsvp !== row.outcome ? rsvp : null;
  if (!now) return { kind, now, explain: null };
  return { kind, now, explain: kind === 'noAnswer' ? 'answeredSince' : 'changed' };
}

export type GuestFilter = 'all' | 'awaiting' | 'confirmed' | 'declined' | 'noAnswer' | 'hasNote';

const OUTCOME_FOR_FILTER: Partial<Record<GuestFilter, CallRoundGuestRow['outcome']>> = {
  awaiting: null,
  confirmed: 'confirmed',
  declined: 'declined',
  noAnswer: 'no_answer',
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
  const order: GuestFilter[] = ['awaiting', 'confirmed', 'declined', 'noAnswer'];

  for (const filter of order) {
    if (rows.some((row) => row.outcome === OUTCOME_FOR_FILTER[filter])) offered.push(filter);
  }
  if (rows.some((row) => row.notes)) offered.push('hasNote');

  return offered;
}
