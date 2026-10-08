import { comparePlanOrder, type PlanEntry } from './timeline';

/**
 * Whether a Confirmation Schedule is a repeat round - the second ask, which says
 * "we haven't heard from you yet" rather than asking for the first time. It is
 * the `requires_follow_up` template axis.
 *
 * Decided by Due Time rather than by what has already gone out, so the preview
 * an Owner approves today is the message the Guest gets later: a Schedule is a
 * follow-up when another Confirmation Schedule on the same Event is due before
 * it. An expired one does not count - it never asked anyone anything.
 *
 * "Before" is `comparePlanOrder`: an Undated Confirmation (ADR 0029) comes after
 * every dated one. Once a round is sent it has a Due Time, so what a Guest
 * receives is always decided between dated rounds; the undated order only
 * shapes the preview of a round the Owner has not dated yet.
 */
export type RoundSchedule = PlanEntry & { status?: string | null };

export function isFollowUpConfirmation(
  schedule: RoundSchedule,
  siblings: RoundSchedule[],
): boolean {
  if (schedule.scheduleTypeKey !== 'confirmation') return false;
  return siblings.some(
    (other) =>
      other.id !== schedule.id &&
      other.scheduleTypeKey === 'confirmation' &&
      other.status !== 'expired' &&
      comparePlanOrder(other, schedule) < 0,
  );
}
