import type { GuestApp } from '@/features/guests/schemas';

export type TransportationSummary = {
  yes: number;
  no: number;
  /** Coming, but the transportation question has no answer yet. */
  unanswered: number;
};

/**
 * Guests (the sum of amounts, as the RSVP meter counts) by their answer to the
 * transportation question. One pass over the list.
 *
 * Only confirmed records count: the question is asked of Guests who are
 * coming, so a pending or declined record is not "unanswered" - it was never
 * asked. An unanswered record is never folded into "no".
 */
export function transportationSummary(
  guests: readonly Pick<GuestApp, 'rsvpStatus' | 'amount' | 'needsTransportation'>[],
): TransportationSummary {
  const summary: TransportationSummary = { yes: 0, no: 0, unanswered: 0 };
  for (const guest of guests) {
    if (guest.rsvpStatus !== 'confirmed') continue;
    const heads = guest.amount ?? 1;
    if (guest.needsTransportation === true) summary.yes += heads;
    else if (guest.needsTransportation === false) summary.no += heads;
    else summary.unanswered += heads;
  }
  return summary;
}
