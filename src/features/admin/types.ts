// The call domain lives in features/calls - admin is a UI surface, not a
// domain owner, and the Owner-facing schedules page depends on these too.
export type { CallOutcome, CallRoundSummary } from '@/features/calls';

import type { CallOutcome, CallRoundSummary } from '@/features/calls';

/**
 * A planned phone_call schedule together with the round executing it, if one
 * has been started. This is the unit the back office works in: the plan is what
 * the Owner scheduled, the round is what the calling team has done about it.
 */
export type CallPlanWithRound = {
  /** The phone_call schedules row - the plan */
  scheduleId: string;
  /** Positional label within the event's call plans, 1-based */
  planNumber: number;
  scheduledDate: string;
  scheduledTime: string | null;
  targetStatus: 'pending' | 'confirmed' | null;
  /** True when the plan was switched off rather than started */
  cancelled: boolean;
  /** Null until an admin starts the round */
  round: CallRoundSummary | null;
};

// Admin-only: carries the operator's working data (phone, notes, seating
// context) that the Owner is never shown.
export type CallLogWithGuest = {
  id: string;
  guestId: string;
  name: string;
  phone: string | null;
  amount: number;
  side: 'bride' | 'groom' | null;
  groupName: string | null;
  currentRsvpStatus: 'pending' | 'confirmed' | 'declined';
  outcome: CallOutcome | null;
  notes: string | null;
  calledAt: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  plan: string;
  signupDate: string;
  /** Published events only. An abandoned draft is interest, not an event. */
  eventCount: number;
  /** Draft Events: onboarding started and not finished. */
  draftCount: number;
  isAdmin: boolean;
};

export type AdminEvent = {
  id: string;
  title: string;
  ownerEmail: string;
  ownerId: string;
  eventDate: string | null;
  status: string;
  guestCount: number;
  confirmedCount: number;
  rsvpPercent: number;
};
