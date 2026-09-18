/**
 * Whether a Confirmation Schedule is a repeat round - the second ask, which says
 * "we haven't heard from you yet" rather than asking for the first time. It is
 * the `requires_follow_up` template axis.
 *
 * Decided by Due Time rather than by what has already gone out, so the preview
 * an Owner approves today is the message the Guest gets later: a Schedule is a
 * follow-up when another Confirmation Schedule on the same Event is due before
 * it. An expired one does not count - it never asked anyone anything.
 */
export type RoundSchedule = {
  id: string;
  scheduleTypeKey: string;
  scheduledDate: string;
  status?: string | null;
};

export function isFollowUpConfirmation(
  schedule: RoundSchedule,
  siblings: RoundSchedule[],
): boolean {
  if (schedule.scheduleTypeKey !== 'confirmation') return false;
  const due = Date.parse(schedule.scheduledDate);
  return siblings.some(
    (other) =>
      other.id !== schedule.id &&
      other.scheduleTypeKey === 'confirmation' &&
      other.status !== 'expired' &&
      Date.parse(other.scheduledDate) < due,
  );
}
