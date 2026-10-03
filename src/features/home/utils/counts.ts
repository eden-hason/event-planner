import type { GroupWithGuestsApp } from '@/features/guests/schemas';
import type { AnswerSourceCounts, GroupHeadsRow, GuestStats } from '../types';

type Countable = { amount?: number | null; rsvpStatus: 'pending' | 'confirmed' | 'declined' };

/** Heads (sum of `amount`) per RSVP status - what Home counts everywhere. */
export function countHeads(guests: ReadonlyArray<Countable>): GuestStats {
  const counts: GuestStats = { total: 0, confirmed: 0, pending: 0, declined: 0 };
  for (const guest of guests) {
    const heads = guest.amount ?? 1;
    counts.total += heads;
    counts[guest.rsvpStatus] += heads;
  }
  return counts;
}

type Answerable = {
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
  rsvpChangeSource?: 'guest' | 'admin_call' | 'manual' | null;
};

/**
 * How answered RSVPs came in, by RSVP Source. Counts Guest Records, not heads:
 * a family answering once is one answer. Pending rows are not answers, and rows
 * with no recorded source are left out of the total too, so the split describes
 * only what is known.
 */
export function countAnswerSources(guests: ReadonlyArray<Answerable>): AnswerSourceCounts {
  const counts: AnswerSourceCounts = { guest: 0, call: 0, list: 0, total: 0 };
  for (const guest of guests) {
    if (guest.rsvpStatus === 'pending' || !guest.rsvpChangeSource) continue;
    const key =
      guest.rsvpChangeSource === 'guest' ? 'guest' : guest.rsvpChangeSource === 'admin_call' ? 'call' : 'list';
    counts[key] += 1;
    counts.total += 1;
  }
  return counts;
}

/** Heads per group, largest group first. Empty groups are left out. */
export function groupHeads(groups: GroupWithGuestsApp[]): GroupHeadsRow[] {
  return groups
    .map((group) => ({ id: group.id, name: group.name, ...countHeads(group.guests) }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** Whole percent of `part` in `whole`, 0 for an empty whole. */
export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}
