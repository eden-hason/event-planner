// View-model types for the calls feature.
// These are not Zod-backed DB schemas - use schemas/ for those.

export const CALL_OUTCOMES = ['no_answer', 'confirmed', 'declined'] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

// A round is in progress until whoever ran it declares it over. Derived
// completion would leave a round with unreachable guests amber forever.
export type CallRoundStatus = 'in_progress' | 'completed';

export type CallRoundSummary = {
  id: string;
  /**
   * The phone_call schedule this round executes. Every round has one - the
   * migration backfilled the legacy ones - but the column stays nullable as an
   * escape hatch, so readers must handle its absence.
   */
  scheduleId: string | null;
  /**
   * Deprecated. Ordering and labelling come from the linked plan; null on
   * anything created after 2026-08-14.
   */
  roundNumber: number | null;
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
 * Deliberately without `calledBy` - which operator placed the call is internal.
 * See the column grants in 20260811000000_call_rounds_owner_visibility.sql and
 * 20260817000001_call_log_notes_visible_to_owner.sql.
 */
export type CallRoundGuestRow = {
  guestId: string;
  guestName: string;
  outcome: CallOutcome | null;
  currentRsvpStatus: 'pending' | 'confirmed' | 'declined';
  /** Headcount on the guest record - one record can cover a whole family */
  amount: number;
  /**
   * What the caller learned on the phone, written by the operator running the
   * round. Host-facing since 2026-08-17; null on most rows, since a note is
   * only worth writing when the call turned up something.
   */
  notes: string | null;
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
