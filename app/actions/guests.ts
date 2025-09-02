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

export interface ImportResult {
  success: boolean;
  message: string;
  importedCount?: number;
  errors?: string[];
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

export async function updateGuest(
  eventId: string,
  guestId: string,
  guestData: GuestData,
): Promise<GuestResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to update guests',
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

    // Update guest document with updated timestamp
    const now = Timestamp.now();
    const guestWithTimestamps = {
      ...validatedData,
      updatedAt: now,
    };

    // Update in Firestore
    const guestRef = firestore
      .collection('users')
      .doc(currentUser.uid)
      .collection('events')
      .doc(eventId)
      .collection('guests')
      .doc(guestId);

    await guestRef.update(guestWithTimestamps);

    // Revalidate the guests page to show the updated guest
    revalidatePath('/guests');

    return {
      success: true,
      message: 'Guest updated successfully',
      guestId: guestId,
    };
  } catch (error) {
    console.error('Update guest error:', error);
    return {
      success: false,
      message: 'Failed to update guest. Please try again.',
    };
  }
}

export async function importGuestsFromCSV(
  eventId: string,
  file: File,
): Promise<ImportResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to import guests',
      };
    }
    console.log('File:', file);
    // Read the CSV file
    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      return {
        success: false,
        message: 'CSV file must have at least a header row and one data row',
      };
    }

    // Parse header row
    const headers = lines[0].split(',').map((h) => h.trim());
    console.log('Headers:', headers);
    const requiredHeaders = ['name', 'phone', 'group'];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      return {
        success: false,
        message: `Missing required columns: ${missingHeaders.join(', ')}`,
      };
    }

    const errors: string[] = [];
    const validGuests: GuestData[] = [];
    const now = Timestamp.now();

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',').map((v) => v.trim());

      if (values.length < headers.length) {
        errors.push(`Row ${i + 1}: Insufficient columns`);
        continue;
      }

      // Create object from row data
      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });

      // Validate and transform data
      try {
        const guestData: GuestData = {
          name: rowData.name,
          phone: rowData.phone,
          group: rowData.group,
          rsvpStatus: (rowData.rsvpstatus || 'pending') as
            | 'confirmed'
            | 'pending'
            | 'declined',
          dietaryRestrictions: rowData.dietaryrestrictions || undefined,
          amount: parseInt(rowData.amount) || 1,
          notes: rowData.notes || undefined,
        };

        // Validate using Zod schema
        const validationResult = GuestDataSchema.safeParse(guestData);
        if (validationResult.success) {
          validGuests.push(validationResult.data);
        } else {
          errors.push(
            `Row ${i + 1}: ${validationResult.error.issues[0].message}`,
          );
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: Invalid data format`);
      }
    }

    if (validGuests.length === 0) {
      return {
        success: false,
        message: 'No valid guests found in CSV file',
        errors,
      };
    }

    // Batch write to Firestore
    const batch = firestore.batch();
    const guestsCollection = firestore
      .collection('users')
      .doc(currentUser.uid)
      .collection('events')
      .doc(eventId)
      .collection('guests');

    validGuests.forEach((guestData) => {
      const guestRef = guestsCollection.doc();
      const guestWithTimestamps = {
        ...guestData,
        createdAt: now,
        updatedAt: now,
      };
      batch.set(guestRef, guestWithTimestamps);
    });

    await batch.commit();

    // Revalidate the guests page
    revalidatePath('/guests');

    const successMessage = `Successfully imported ${validGuests.length} guests`;
    const errorMessage =
      errors.length > 0 ? ` with ${errors.length} errors` : '';

    return {
      success: true,
      message: successMessage + errorMessage,
      importedCount: validGuests.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('CSV import error:', error);
    return {
      success: false,
      message:
        'Failed to import guests. Please check your CSV format and try again.',
    };
  }
}
