import { z } from 'zod';
import type { EventApp } from '@/features/events/schemas';
import type { GuestApp } from '@/features/guests/schemas';

// --- Confirmation Form Schema ---
export const ConfirmationFormSchema = z.object({
  token: z.string().min(1),
  rsvpStatus: z.enum(['confirmed', 'declined']),
  guestCount: z.coerce.number().int().min(1).optional(),
  dietaryRestrictions: z.string().optional(),
});

export type ConfirmationFormData = z.infer<typeof ConfirmationFormSchema>;

// --- Action State ---
export type ConfirmationActionState = {
  success: boolean;
  message: string;
};

// --- Page Data (returned by query) ---
export type ConfirmationPageData = {
  deliveryId: string;
  respondedAt: string | null;
  responseData: {
    guest_count?: number;
    dietary_restrictions?: string;
    notes?: string;
  } | null;
  guest: Pick<
    GuestApp,
    'id' | 'name' | 'amount' | 'rsvpStatus' | 'dietaryRestrictions'
  >;
  event: Pick<
    EventApp,
    | 'id'
    | 'title'
    | 'eventDate'
    | 'ceremonyTime'
    | 'receptionTime'
    | 'location'
    | 'hostDetails'
    | 'guestExperience'
    | 'eventType'
    | 'venueName'
  >;
  scheduleId: string;
};
