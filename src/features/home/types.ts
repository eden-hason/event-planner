// View-model types for the home feature.
// These are not Zod-backed DB schemas - use schemas/ for those.

export type RecentRsvpRow = {
  id: string;
  name: string;
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
  rsvpChangedAt: string;
  rsvpChangeSource: 'manual' | 'guest' | 'admin_call' | null;
};

export type GuestStats = {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
};

/** A Featured Action picked by its eligibility rule (ADR 0010), grouped into tiers in `utils/featured-actions`. */
export type RankedActionKey =
  | 'package'
  | 'planAsk'
  | 'details'
  | 'groups'
  | 'invitationImage'
  | 'collaborator'
  | 'health'
  | 'test'
  | 'seating'
  | 'gifting'
  | 'budget';

/** Always eligible; fills whatever slots the ranked actions leave. */
export type FallbackActionKey = 'addGuest' | 'ai' | 'viewList';

export type FeaturedActionKey = RankedActionKey | FallbackActionKey;

/** The facts every eligibility rule reads, gathered once per render. */
export type FeaturedActionFacts = {
  detailsComplete: boolean;
  guestRecords: number;
  groupCount: number;
  hasInvitationImage: boolean;
  collaboratorCount: number;
  duplicateRecords: number;
  noPhoneRecords: number;
  /**
   * A Test Message can go out now: an unsent Confirmation, the host names it is
   * sent in, and room under the Event's, the account's and the viewer's caps.
   */
  canReceiveTestMessage: boolean;
  confirmedHeads: number;
  tableCount: number;
  giftingConfigured: boolean;
  expenseCount: number;
  /** Guest Records beyond the Record Package, which no Schedule will reach (ADR 0027). */
  recordsOverPackage: number;
  /**
   * The Event can send but none of its Initial Invitations or Confirmations is
   * dated, so nothing will ever ask its Guests anything (ADR 0029).
   */
  noAskPlanned: boolean;
};

export type StatusStripData = {
  /** Null when nothing was logged and no budget set - "not started". */
  budget: { spent: number; total: number | null } | null;
  /** Null when no Table exists yet. Guest Records, per ADR 0009. */
  seating: { seated: number; total: number } | null;
  schedule:
    | { kind: 'next'; typeKey: string; days: number }
    | { kind: 'pending'; count: number }
    | { kind: 'allSent' }
    | null;
};

export type GroupHeadsRow = {
  id: string;
  name: string;
  confirmed: number;
  pending: number;
  declined: number;
  total: number;
};
