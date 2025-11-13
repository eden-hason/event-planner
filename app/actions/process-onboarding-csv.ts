'use server';

import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import {
  processCSVFromStorage,
  ProcessCSVResult,
} from '@/lib/utils/process-csv';
import { FileMetadata } from '@/lib/schemas/onboarding';
import { GuestUpsertSchema } from '@/lib/schemas/guest.schema';

export interface ProcessOnboardingCSVResult {
  success: boolean;
  message: string;
  importedCount?: number;
  errors?: Array<{ row: number; message: string }>;
}

/**
 * Processes the CSV file uploaded during onboarding event step
 * Retrieves the file from storage, parses it, and creates guest records
 * @returns Process result with imported count or errors
 */
export async function processOnboardingCSV(): Promise<ProcessOnboardingCSVResult> {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'You must be logged in to process CSV file',
      };
    }

    const supabase = await createClient();

    // Get the user's event (should be the one created during onboarding)
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, file_metadata')
      // .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (eventsError) {
      console.error('Error fetching event:', eventsError);
      return {
        success: false,
        message: 'Failed to fetch event. Please try again.',
      };
    }

    if (!events || !events.id) {
      return {
        success: false,
        message: 'No event found. Please complete the event step first.',
      };
    }

    const eventId = events.id;

    // Parse file metadata from event
    let fileMetadata: FileMetadata | undefined = undefined;
    const fileSource = events.file_metadata;
    if (fileSource) {
      try {
        // Check if it's JSON string (new format) or already an object (JSONB)
        if (typeof fileSource === 'string' && fileSource.startsWith('{')) {
          fileMetadata = JSON.parse(fileSource);
        } else if (typeof fileSource === 'object') {
          // Already an object (if stored as JSONB)
          fileMetadata = fileSource as FileMetadata;
        }
      } catch (error) {
        console.error('Error parsing file metadata:', error);
        return {
          success: false,
          message:
            'Failed to parse file metadata. Please try uploading the file again.',
        };
      }
    }

    if (!fileMetadata || !fileMetadata.path) {
      return {
        success: false,
        message:
          'No CSV file found. Please upload a CSV file in the event step.',
      };
    }

    // Process CSV file from storage
    const processResult: ProcessCSVResult = await processCSVFromStorage(
      fileMetadata.path,
    );

    if (!processResult.success || !processResult.guests) {
      return {
        success: false,
        message: processResult.message || 'Failed to process CSV file',
        errors: processResult.errors,
      };
    }

    const guests = processResult.guests;

    // Validate and create guest records
    const errors: Array<{ row: number; message: string }> = [];
    let createdCount = 0;

    // Process guests in batches to avoid overwhelming the database
    // For now, we'll process them one by one, but this can be optimized with batch inserts
    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];

      try {
        // Validate guest data
        const validationResult = GuestUpsertSchema.safeParse(guest);
        if (!validationResult.success) {
          const firstError = validationResult.error.issues[0];
          errors.push({
            row: i + 2, // +2 because CSV rows start at 2 (after header) and 0-indexed becomes 1-indexed
            message: firstError.message,
          });
          continue;
        }

        const validatedGuest = validationResult.data;

        const { error: insertError } = await supabase.from('guests').insert({
          event_id: eventId,
          name: validatedGuest.name,
          phone_number: validatedGuest.phone,
          guest_group: validatedGuest.guestGroup,
          // rsvp_status: validatedGuest.rsvpStatus,
          amount: validatedGuest.amount,
          dietary_restrictions: validatedGuest.dietaryRestrictions || null,
          notes: validatedGuest.notes || null,
        });

        if (insertError) {
          errors.push({
            row: i + 2,
            message: `Failed to create guest: ${insertError.message}`,
          });
          continue;
        }

        createdCount++;
      } catch (error) {
        console.error(`Error creating guest at row ${i + 2}:`, error);
        errors.push({
          row: i + 2,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to create guest record',
        });
      }
    }

    if (createdCount === 0 && errors.length > 0) {
      return {
        success: false,
        message: 'No guests were created. All rows had errors.',
        errors,
      };
    }

    const successMessage =
      errors.length > 0
        ? `Successfully imported ${createdCount} guests with ${errors.length} error(s)`
        : `Successfully imported ${createdCount} guests`;

    return {
      success: true,
      message: successMessage,
      importedCount: createdCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Process onboarding CSV error:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to process CSV file. Please try again.',
    };
  }
}
