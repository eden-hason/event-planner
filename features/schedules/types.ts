// View-model types for the schedules feature.
// These are not Zod-backed DB schemas — use schemas/ for those.

export type ActivityStatus = 'read' | 'confirmed' | 'declined';

export type DeliveryActivityRow = {
  id: string;
  guestName: string;
  guestPhone: string;
  activityStatus: ActivityStatus;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  respondedAt: string | null;
};

export type DeliveryActivityPage = {
  rows: DeliveryActivityRow[];
  total: number;
};
