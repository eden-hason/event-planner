import type { GuestApp } from '@/features/guests/schemas';

/**
 * A Guest Record carries two counts (ADR 0023): `invitedAmount`, how many the
 * Owner invited, and `amount`, how many are coming - which the Guest's own
 * answer writes. These are the rules for showing and saving the pair.
 */

type AmountGuest = Pick<
  GuestApp,
  'rsvpStatus' | 'amount' | 'invitedAmount' | 'rsvpChangeSource'
>;

export type AmountDisplay = {
  /** The one number the list shows: coming once confirmed, invited otherwise. */
  value: number;
  invited: number;
  /** The Guest answered a count other than their invitation - fewer or more. */
  changedByGuest: boolean;
};

export function amountDisplay(guest: AmountGuest): AmountDisplay {
  const invited = guest.invitedAmount ?? guest.amount;
  if (guest.rsvpStatus !== 'confirmed') {
    return { value: invited, invited, changedByGuest: false };
  }
  // A call's outcome is the Guest's answer relayed by an Operator, so it counts;
  // a count the Owner typed in themselves does not.
  const answeredByGuest =
    guest.rsvpChangeSource === 'guest' ||
    guest.rsvpChangeSource === 'admin_call';
  return {
    value: guest.amount,
    invited,
    changedByGuest: answeredByGuest && guest.amount !== invited,
  };
}

/**
 * What the drawer saves. Only a confirmed record has an answer of its own; a
 * pending or declined one is expected at its invitation.
 */
export function resolveAmounts({
  rsvpStatus,
  invited,
  coming,
}: {
  rsvpStatus: GuestApp['rsvpStatus'];
  invited: number;
  coming: number;
}): { invitedAmount: number; amount: number } {
  const invitedAmount = Math.max(1, Math.floor(invited) || 1);
  const amount =
    rsvpStatus === 'confirmed'
      ? Math.max(1, Math.floor(coming) || 1)
      : invitedAmount;
  return { invitedAmount, amount };
}

type AnswerState = { rsvpStatus: GuestApp['rsvpStatus']; amount: number };

/**
 * Whether an Owner's save is their own answer for the Guest, to be recorded as
 * theirs (`rsvp_change_source = 'manual'`): a new status, or a new count on a
 * confirmed record. The count is the Guest's answer once confirmed, so the
 * Owner changing it overrides them - and the list stops calling it the Guest's
 * change. Fields the save leaves out (`undefined`) are unchanged.
 */
export function isOwnerOverride({
  before,
  after,
}: {
  before: AnswerState;
  after: {
    rsvpStatus: GuestApp['rsvpStatus'] | undefined;
    amount: number | undefined;
  };
}): boolean {
  const status = after.rsvpStatus ?? before.rsvpStatus;
  if (status !== before.rsvpStatus) return true;
  return (
    status === 'confirmed' &&
    after.amount !== undefined &&
    after.amount !== before.amount
  );
}
