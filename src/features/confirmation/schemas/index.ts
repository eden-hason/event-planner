import { z } from 'zod';
import type { EventApp } from '@/features/events/schemas';
import type { GuestApp } from '@/features/guests/schemas';
import type { MealCounts } from '../utils/meal-counts';

// --- Confirmation Form Schema ---
export const ConfirmationFormSchema = z.object({
  token: z.string().min(1),
  rsvpStatus: z.enum(['confirmed', 'declined']),
  guestCount: z.coerce.number().int().min(1).optional(),
  /** JSON of a MealCounts map; parsed and normalised by the action. */
  mealCounts: z.string().optional(),
});

export type ConfirmationFormData = z.infer<typeof ConfirmationFormSchema>;

// --- Action State ---
export type ConfirmationActionState = {
  success: boolean;
  message: string;
};

// --- Page Data (returned by query) ---
export type ConfirmationPageData = {
  deliveryId: string | null;
  respondedAt: string | null;
  responseData: {
    guestCount?: number;
  } | null;
  guest: Pick<GuestApp, 'id' | 'name' | 'amount' | 'rsvpStatus'> & {
    mealCounts: MealCounts;
  };
  event: Pick<
    EventApp,
    | 'id'
    | 'title'
    | 'eventDate'
    | 'ceremonyTime'
    | 'receptionTime'
    | 'location'
    | 'guestExperience'
    | 'eventType'
  > & {
    /** The "החתונה של" frame, printed above the names, or null on an event
     *  whose type never resolved - there `title` carries the whole sentence. */
    titlePrefix: string | null;
    /** The host names on their own, so the page can set them apart. */
    hosts: string[];
    /** False past the RSVP Cutoff - the answer is shown, no longer editable. */
    rsvpOpen: boolean;
  };
  scheduleId: string | null;
};
