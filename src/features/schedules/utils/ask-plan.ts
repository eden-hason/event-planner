/**
 * Whether an Event has planned no way of asking its Guests anything.
 *
 * Initial Invitations and Confirmations - the asks - begin undated and are never
 * sent until the Owner dates them (ADR 0029). An Owner who never does sends
 * nothing at all, so this condition drives both the Owner's Featured Action and
 * the Operator's **No Ask Planned** Signal.
 *
 * Dating any one ask clears it. An Owner who invites on paper and only wants a
 * Confirmation is not chased about the Invitation, and an ask that has gone out
 * was dated by definition. Whether the Event can send, and how near it is, are
 * the caller's to add: this answers only for the plan.
 */

export const ASK_TYPE_KEYS: readonly string[] = ['initial_invitation', 'confirmation'];

export type AskPlanRow = {
  scheduleTypeKey: string;
  scheduledDate: string | null;
};

export function hasNoAskPlanned(schedules: readonly AskPlanRow[]): boolean {
  const asks = schedules.filter((row) => ASK_TYPE_KEYS.includes(row.scheduleTypeKey));
  // An Event with no asks in its plan at all (a type with no defaults) has
  // nothing the Owner could date, so there is nothing to suggest.
  return asks.length > 0 && asks.every((row) => row.scheduledDate === null);
}
