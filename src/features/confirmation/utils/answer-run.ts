/**
 * Whether an RSVP write continues the Guest's latest answer rather than giving
 * a new one.
 *
 * The Confirmation Conversation writes after every step - "Coming", the count,
 * the meal, transportation - so one answer arrives as a run of writes. A write
 * with the same response through the same channel, within half an hour of the
 * last one, is the same answer still being filled in: it updates that answer's
 * interaction in place instead of adding another. Changing between confirmed
 * and declined, switching channel, or coming back later is a new answer.
 *
 * The cleanup migration `20261014000000_collapse_rsvp_answer_runs.sql` applies
 * the same rule to the rows written before it existed.
 */

export const ANSWER_RUN_GAP_MS = 30 * 60 * 1000;

export type RsvpInteractionType = 'rsvp_confirm' | 'rsvp_decline';

export type LatestAnswer = {
  interactionType: RsvpInteractionType;
  channel: string | null;
  at: string;
};

export function continuesAnswer(
  latest: LatestAnswer | null,
  next: { interactionType: RsvpInteractionType; channel: string; at: Date },
): boolean {
  if (!latest) return false;
  return (
    latest.interactionType === next.interactionType &&
    latest.channel === next.channel &&
    next.at.getTime() - Date.parse(latest.at) <= ANSWER_RUN_GAP_MS
  );
}
