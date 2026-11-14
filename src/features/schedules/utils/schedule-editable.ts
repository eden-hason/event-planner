/**
 * Whether the Owner may still change an open message Schedule: not sent, not
 * switched off, not expired, and not claimed by the Dispatcher - a claimed
 * Schedule's messages are already rendered and queued, so a change would only
 * alter what the page claims (ADR 0013). One rule for both Message Plans'
 * panes and the current plan's save.
 *
 * A Schedule locked behind payment ('disabled') is still open: the lock only
 * stops sending, and activation keeps what the Owner set (it turns 'disabled'
 * back to null and touches nothing else). The Schedules page panes add their
 * own `locked` gate on top of this.
 */
export function isScheduleEditable(schedule: {
  status: string | null;
  dispatchedAt?: string | null;
}): boolean {
  return (
    schedule.status !== 'sent' &&
    schedule.status !== 'cancelled' &&
    schedule.status !== 'expired' &&
    schedule.dispatchedAt == null
  );
}
