export type GuestCounts = {
  pending: number;
  confirmed: number;
  declined: number;
  offlineRsvp: number;
  total: number;
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
