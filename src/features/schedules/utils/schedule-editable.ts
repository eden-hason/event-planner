/**
 * Whether the Owner may still change an open message Schedule: not sent, not
 * switched off, not expired, not locked behind payment ('disabled'), and not
 * claimed by the Dispatcher - a claimed Schedule's messages are already
 * rendered and queued, so a change would only alter what the page claims
 * (ADR 0013). One rule for both Message Plans' panes and the current plan's
 * save.
 */
export function isScheduleEditable(schedule: {
  status: string | null;
  dispatchedAt?: string | null;
}): boolean {
  return (
    schedule.status !== 'sent' &&
    schedule.status !== 'cancelled' &&
    schedule.status !== 'expired' &&
    schedule.status !== 'disabled' &&
    schedule.dispatchedAt == null
  );
}
