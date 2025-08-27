'use server';

import { getCurrentUser } from '@/lib/auth';
import { firestore } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const GuestDataSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  phone: z.string().min(1, 'Phone is required'),
  group: z.string().min(1, 'Group is required'),
  rsvpStatus: z.enum(['confirmed', 'pending', 'declined']).default('pending'),
  dietaryRestrictions: z.string().optional(),
  amount: z.number().min(1, 'Amount must be at least 1').default(1),
  notes: z.string().optional(),
});

export type GuestData = z.infer<typeof GuestDataSchema>;

export interface GuestResult {
  success: boolean;
  message: string;
  guestId?: string;
}

export async function createGuest(
  eventId: string,
  guestData: GuestData,
): Promise<GuestResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to create guests',
      };
    }

    // Validate data using Zod schema
    const validationResult = GuestDataSchema.safeParse(guestData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        success: false,
        message: firstError.message,
      };
    }

    const validatedData = validationResult.data;

    // Create guest document with timestamps
    const now = Timestamp.now();
    const guestWithTimestamps = {
      ...validatedData,
      createdAt: now,
      updatedAt: now,
    };

    // Save to Firestore using the correct path: users/{userId}/events/{eventId}/guests/{guestId}
    const guestRef = firestore
      .collection('users')
      .doc(currentUser.uid)
      .collection('events')
      .doc(eventId)
      .collection('guests')
      .doc();

    await guestRef.set(guestWithTimestamps);

    // Revalidate the guests page to show the new guest
    revalidatePath('/guests');

    return {
      success: true,
      message: 'Guest created successfully',
      guestId: guestRef.id,
    };
  } catch (error) {
    console.error('Create guest error:', error);
    return {
      success: false,
      message: 'Failed to create guest. Please try again.',
    };
  }
}
