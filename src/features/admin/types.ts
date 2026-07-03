export type CallOutcome = 'no_answer' | 'confirmed' | 'declined';

export type CallRoundSummary = {
  id: string;
  roundNumber: number;
  createdAt: string;
  total: number;
  awaiting: number;
  confirmed: number;
  declined: number;
  noAnswer: number;
};

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
