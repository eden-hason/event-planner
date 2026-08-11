// View-model types for the calls feature.
// These are not Zod-backed DB schemas - use schemas/ for those.

export const CALL_OUTCOMES = ['no_answer', 'confirmed', 'declined'] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

// A round is in progress until whoever ran it declares it over. Derived
// completion would leave a round with unreachable guests amber forever.
export type CallRoundStatus = 'in_progress' | 'completed';

export type CallRoundSummary = {
  id: string;
  roundNumber: number;
  createdAt: string;
  completedAt: string | null;
  status: CallRoundStatus;
  total: number;
  awaiting: number;
  confirmed: number;
  declined: number;
  noAnswer: number;
};

/**
 * One guest's row in a round, as the Owner sees it.
 *
 * Carries both the call outcome and the guest's RSVP status right now: a
 * guest snapshotted into the round can confirm by WhatsApp the next day and
 * be correctly skipped, leaving `outcome` null forever. Showing the outcome
 * alone would read as "your planner never called 12 people".
 *
 * Deliberately without `notes` and `calledBy` - see the column grants in
 * 20260811000000_call_rounds_owner_visibility.sql.
 */
export type CallRoundGuestRow = {
  guestId: string;
  guestName: string;
  outcome: CallOutcome | null;
  calledAt: string | null;
  currentRsvpStatus: 'pending' | 'confirmed' | 'declined';
  /** Headcount on the guest record - one record can cover a whole family */
  amount: number;
};

export type CallRoundResults = {
  summary: Pick<
    CallRoundSummary,
    'total' | 'awaiting' | 'confirmed' | 'declined' | 'noAnswer'
  > & {
    /**
     * People the confirmed records cover, not the number of records. The
     * round confirming 8 records can mean 20 people through the door, and
     * that is the number the owner is actually planning against.
     */
    confirmedGuests: number;
  };
  guests: CallRoundGuestRow[];
};
