import type { GuestApp } from '@/features/guests/schemas';
import { headsFor } from './guest-amount';
import type { RsvpStatus } from './rsvp-presentation';

export type RsvpHeadcounts = Record<RsvpStatus, number> & { total: number };

/**
 * Guests (people, not records) per RSVP status - what the RSVP meters count.
 * Each record counts as the list shows it (headsFor), so the meters and the
 * filtered list always agree. One pass over the list.
 */
export function rsvpHeadcounts(
  guests: readonly Pick<GuestApp, 'rsvpStatus' | 'amount' | 'invitedAmount'>[],
): RsvpHeadcounts {
  const counts: RsvpHeadcounts = { total: 0, confirmed: 0, pending: 0, declined: 0 };
  for (const guest of guests) {
    const heads = headsFor(guest) ?? 1;
    counts[guest.rsvpStatus] += heads;
    counts.total += heads;
  }
  return counts;
}

/** A status's share of all guests, in percent. */
export function headcountShare(counts: RsvpHeadcounts, status: RsvpStatus) {
  return counts.total ? (counts[status] / counts.total) * 100 : 0;
}
