import type { GuestApp } from '@/features/guests/schemas';

/** A Guest Record's place in the transportation summary - and its filter. */
export type TransportationAnswer = 'yes' | 'no' | 'unanswered';

export const TRANSPORTATION_ANSWERS: readonly TransportationAnswer[] = [
  'yes',
  'no',
  'unanswered',
];

type TransportationRecord = Pick<GuestApp, 'rsvpStatus' | 'needsTransportation'>;

/**
 * Where a Guest Record counts, or null when it does not count at all.
 *
 * Only confirmed records count: the question is asked of Guests who are
 * coming, so a pending or declined record is not "unanswered" - it was never
 * asked. An unanswered record is never folded into "no". The summary and the
 * guest list's filter both read this, so a filter shows exactly the records
 * the number beside it counts.
 */
export function transportationAnswer(
  guest: TransportationRecord,
): TransportationAnswer | null {
  if (guest.rsvpStatus !== 'confirmed') return null;
  if (guest.needsTransportation === true) return 'yes';
  if (guest.needsTransportation === false) return 'no';
  return 'unanswered';
}

export type TransportationSummary = Record<TransportationAnswer, number>;

/**
 * Guests (the sum of amounts, as the RSVP meter counts) by their answer to the
 * transportation question. One pass over the list.
 */
export function transportationSummary(
  guests: readonly (TransportationRecord & Pick<GuestApp, 'amount'>)[],
): TransportationSummary {
  const summary: TransportationSummary = { yes: 0, no: 0, unanswered: 0 };
  for (const guest of guests) {
    const answer = transportationAnswer(guest);
    if (answer) summary[answer] += guest.amount ?? 1;
  }
  return summary;
}
