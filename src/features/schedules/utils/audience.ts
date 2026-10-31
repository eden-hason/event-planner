/**
 * Who a Schedule goes to, as `schedules.target_status` stores it. Null is every
 * Guest; `not_declined` is everyone but those who said they are not coming, the
 * Advance Reminder's audience (ADR 0051). Call plans only ever use the first two.
 */
export const TARGET_STATUSES = ['pending', 'confirmed', 'not_declined'] as const;
export type TargetStatus = (typeof TARGET_STATUSES)[number];

/**
 * The one audience predicate: the send engine (`filterGuestsByTarget`), the
 * Catch-up offer and the Back Office counts all ask it, so a Guest is in the
 * same audience wherever it is shown.
 */
export function inAudience(targetStatus: string | null | undefined, rsvpStatus: string): boolean {
  if (!targetStatus) return true;
  if (targetStatus === 'not_declined') return rsvpStatus !== 'declined';
  return rsvpStatus === targetStatus;
}

/** The `schedules.audience` message naming an audience, for every page that shows one. */
export function audienceLabelKey(
  targetStatus: TargetStatus | null | undefined,
): 'allGuests' | 'confirmedGuests' | 'pendingGuests' | 'notDeclinedGuests' {
  if (targetStatus === 'confirmed') return 'confirmedGuests';
  if (targetStatus === 'pending') return 'pendingGuests';
  if (targetStatus === 'not_declined') return 'notDeclinedGuests';
  return 'allGuests';
}
