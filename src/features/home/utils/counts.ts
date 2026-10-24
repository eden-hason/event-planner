import type { GroupWithGuestsApp } from '@/features/guests/schemas';
import type { GroupHeadsRow, GuestStats } from '../types';

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
