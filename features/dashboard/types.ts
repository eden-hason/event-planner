// View-model types for the dashboard feature.
// These are not Zod-backed DB schemas — use schemas/ for those.

export type RecentRsvpRow = {
  id: string;
  name: string;
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
  rsvpChangedAt: string;
  rsvpChangedByName: string | null;
  rsvpChangeSource: 'manual' | 'guest' | null;
};

export type GuestStats = {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
};
