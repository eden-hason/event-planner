// The call domain lives in features/calls - admin is a UI surface, not a
// domain owner, and the Owner-facing schedules page depends on these too.
export type { CallOutcome, CallRoundSummary } from '@/features/calls';

import type { CallOutcome } from '@/features/calls';

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
  eventCount: number;
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
