import { z } from 'zod';

// =====================================================
// CONFIRMATION PAGE DATA
// =====================================================

// Data passed from server component to client confirmation form
export type ConfirmationPageData = {
  guest: {
    id: string;
    name: string;
    amount: number;
  };
  event: {
    id: string;
    title: string;
    description?: string;
    eventDate: string;
    eventType?: string;
    ceremonyTime?: string;
    receptionTime?: string;
    location?: {
      name: string;
      coords?: {
        lat: number;
        lng: number;
      };
    };
  };
  delivery: {
    id: string;
    scheduleId: string;
    respondedAt?: string;
    responseData?: {
      guestCount?: number;
      notes?: string;
    };
  };
  existingRsvp: {
    status: 'pending' | 'confirmed' | 'declined';
    guestCount?: number;
    notes?: string;
    respondedAt?: string;
  } | null;
};

// =====================================================
// CONFIRMATION RESPONSE FORM
// =====================================================

export const ConfirmationResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('confirmed'),
    guestCount: z.number().int().min(1, 'At least 1 guest is required'),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    status: z.literal('declined'),
    notes: z.string().max(500).optional(),
  }),
]);

export type ConfirmationResponse = z.infer<typeof ConfirmationResponseSchema>;

// =====================================================
// ACTION STATE
// =====================================================

export type ConfirmationActionState = {
  success: boolean;
  message?: string;
};
